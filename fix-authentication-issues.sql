-- Bulletproof Authentication Fix
-- Addresses metadata mismatch, trigger resilience, and timing issues

-- Step 1: Fix metadata key mismatch in trigger
-- Update trigger to check both user_metadata and raw_user_meta_data

CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Comprehensive logging at every step
    RAISE NOTICE '=== SYNC_USER_ROLE TRIGGER START ===';
    RAISE NOTICE 'User ID: %', NEW.id;
    RAISE NOTICE 'User Email: %', NEW.email;
    RAISE NOTICE 'Raw User Metadata: %', NEW.raw_user_meta_data;
    RAISE NOTICE 'User Metadata: %', NEW.user_metadata;
    RAISE NOTICE 'App Metadata: %', NEW.app_metadata;
    
    -- Declare variables with explicit defaults
    DECLARE
        user_database_role TEXT := 'User';  -- Explicit default
        user_name TEXT := COALESCE(NEW.email, 'Unknown User');  -- Fallback
        user_is_guest BOOLEAN := FALSE;  -- Explicit default
        user_email TEXT := NEW.email;
        profile_exists BOOLEAN := FALSE;
        insert_success BOOLEAN := FALSE;
        update_success BOOLEAN := FALSE;
        error_message TEXT;
    BEGIN
        -- Safely extract database_role with multiple fallbacks INCLUDING user_metadata
        BEGIN
            user_database_role := COALESCE(
                NEW.user_metadata->>'database_role',  -- Check user_metadata first (callback stores here)
                NEW.raw_user_meta_data->>'database_role',
                NEW.raw_user_meta_data->>'role',
                NEW.app_metadata->>'database_role',
                NEW.app_metadata->>'role',
                'User'
            );
            RAISE NOTICE 'Extracted database_role: %', user_database_role;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error extracting database_role: %, using default User', SQLERRM;
                user_database_role := 'User';
        END;
        
        -- Normalize role to ensure it matches CHECK constraint
        IF user_database_role IN ('admin', 'Admin', 'ADMIN') THEN
            user_database_role := 'Admin';
        ELSIF user_database_role IN ('user', 'User', 'USER') THEN
            user_database_role := 'User';
        ELSE
            RAISE NOTICE 'Unknown role %, defaulting to User', user_database_role;
            user_database_role := 'User';
        END IF;
        
        -- Safely extract name with multiple fallbacks INCLUDING user_metadata
        BEGIN
            user_name := COALESCE(
                NEW.user_metadata->>'name',  -- Check user_metadata first
                NEW.user_metadata->>'full_name',
                NEW.raw_user_meta_data->>'name',
                NEW.raw_user_meta_data->>'full_name',
                NEW.raw_user_meta_data->>'user_name',
                NEW.app_metadata->>'name',
                NEW.app_metadata->>'full_name',
                NEW.email,
                'Unknown User'
            );
            RAISE NOTICE 'Extracted name: %', user_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error extracting name: %, using fallback', SQLERRM;
                user_name := COALESCE(NEW.email, 'Unknown User');
        END;
        
        -- Safely extract is_guest flag from all metadata sources
        BEGIN
            user_is_guest := COALESCE(
                (NEW.user_metadata->>'is_guest')::boolean,
                (NEW.raw_user_meta_data->>'is_guest')::boolean,
                (NEW.app_metadata->>'is_guest')::boolean,
                FALSE
            );
            RAISE NOTICE 'Extracted is_guest: %', user_is_guest;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error extracting is_guest: %, defaulting to FALSE', SQLERRM;
                user_is_guest := FALSE;
        END;
        
        -- Check if profile exists
        BEGIN
            SELECT EXISTS(SELECT 1 FROM profiles WHERE id = NEW.id) INTO profile_exists;
            RAISE NOTICE 'Profile exists: %', profile_exists;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error checking profile existence: %', SQLERRM;
                profile_exists := FALSE;
        END;
        
        -- Try UPDATE first if profile exists
        IF profile_exists THEN
            BEGIN
                UPDATE profiles 
                SET 
                    database_role = user_database_role,
                    full_name = user_name,
                    is_guest = user_is_guest,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = NEW.id;
                
                GET DIAGNOSTICS update_success = ROW_COUNT;
                RAISE NOTICE 'Profile UPDATE successful, rows affected: %', update_success;
            EXCEPTION
                WHEN OTHERS THEN
                    error_message := SQLERRM;
                    RAISE NOTICE 'Profile UPDATE failed: %', error_message;
                    update_success := FALSE;
            END;
        END IF;
        
        -- If UPDATE failed or profile doesn't exist, try INSERT
        IF NOT profile_exists OR NOT update_success THEN
            BEGIN
                INSERT INTO profiles (id, full_name, database_role, email, is_guest)
                VALUES (
                    NEW.id,
                    user_name,
                    user_database_role,
                    user_email,
                    user_is_guest
                );
                
                GET DIAGNOSTICS insert_success = ROW_COUNT;
                RAISE NOTICE 'Profile INSERT successful, rows affected: %', insert_success;
            EXCEPTION
                WHEN OTHERS THEN
                    error_message := SQLERRM;
                    RAISE NOTICE 'Profile INSERT failed: %', error_message;
                    insert_success := FALSE;
                    
                    -- Try minimal insert as last resort
                    BEGIN
                        INSERT INTO profiles (id, full_name, database_role, email)
                        VALUES (NEW.id, user_name, 'User', user_email);
                        RAISE NOTICE 'Minimal profile INSERT successful as fallback';
                        insert_success := TRUE;
                    EXCEPTION
                        WHEN OTHERS THEN
                            RAISE NOTICE 'Minimal profile INSERT also failed: %', SQLERRM;
                    END;
            END;
        END IF;
        
        -- Final status
        IF insert_success OR update_success THEN
            RAISE NOTICE '=== SYNC_USER_ROLE TRIGGER SUCCESS ===';
        ELSE
            RAISE NOTICE '=== SYNC_USER_ROLE TRIGGER FAILED BUT AUTH CONTINUES ===';
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '=== SYNC_USER_ROLE TRIGGER CRITICAL ERROR ===';
            RAISE NOTICE 'Critical error: %', SQLERRM;
            -- DO NOT re-raise exception - let auth continue
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
        -- Step 2: Add timing helper function to check if profile is ready
CREATE OR REPLACE FUNCTION wait_for_profile_sync(user_id UUID, max_attempts INTEGER DEFAULT 10)
RETURNS BOOLEAN AS $$
DECLARE
    attempt INTEGER := 0;
    profile_exists BOOLEAN := FALSE;
BEGIN
    WHILE attempt < max_attempts AND NOT profile_exists LOOP
        SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_id) INTO profile_exists;
        
        IF NOT profile_exists THEN
            -- Wait 200ms between attempts
            PERFORM pg_sleep(0.2);
            attempt := attempt + 1;
            RAISE NOTICE 'Waiting for profile sync, attempt %/%', attempt, max_attempts;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Profile sync wait completed, exists: %, attempts: %', profile_exists, attempt;
    RETURN profile_exists;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Add comprehensive debugging function
CREATE OR REPLACE FUNCTION debug_auth_flow(user_id UUID)
RETURNS TABLE(
    step TEXT,
    status TEXT,
    details JSONB
) AS $$
BEGIN
    -- Step 1: Check auth.users
    RETURN QUERY
    SELECT 
        'auth_users'::TEXT as step,
        'checked'::TEXT as status,
        jsonb_build_object(
            'id', u.id,
            'email', u.email,
            'created_at', u.created_at,
            'raw_user_meta_data', u.raw_user_meta_data,
            'user_metadata', u.user_metadata,
            'app_metadata', u.app_metadata
        ) as details
    FROM auth.users u
    WHERE u.id = user_id;
    
    -- Step 2: Check profiles
    RETURN QUERY
    SELECT 
        'profiles'::TEXT as step,
        CASE WHEN p.id IS NOT NULL THEN 'exists' ELSE 'missing' END as status,
        jsonb_build_object(
            'id', p.id,
            'full_name', p.full_name,
            'email', p.email,
            'database_role', p.database_role,
            'is_guest', p.is_guest,
            'created_at', p.created_at
        ) as details
    FROM profiles p
    WHERE p.id = user_id;
    
    -- Step 3: Check trigger status
    RETURN QUERY
    SELECT 
        'trigger_status'::TEXT as step,
        'active'::TEXT as status,
        jsonb_build_object(
            'trigger_exists', EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_sync_user_role'),
            'function_exists', EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'sync_user_role')
        ) as details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Ensure trigger is properly attached
DROP TRIGGER IF EXISTS trigger_sync_user_role ON auth.users;
CREATE TRIGGER trigger_sync_user_role
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_role();

-- Step 5: Grant necessary permissions
GRANT EXECUTE ON FUNCTION wait_for_profile_sync TO authenticated;
GRANT EXECUTE ON FUNCTION debug_auth_flow TO authenticated;

-- ==========================================
-- HOW TO USE:
-- 
-- 1. Run this script to fix the metadata mismatch and timing issues
-- 2. To debug authentication issues:
--    SELECT * FROM debug_auth_flow('user-uuid');
-- 3. To wait for profile sync (in callback):
--    SELECT wait_for_profile_sync('user-uuid', 10);
-- 
-- This fixes:
-- - Metadata key mismatch (user_metadata vs raw_user_meta_data)
-- - Adds timing helper for callback race conditions
-- - Makes trigger ultra-resilient with comprehensive error handling
-- ==========================================
