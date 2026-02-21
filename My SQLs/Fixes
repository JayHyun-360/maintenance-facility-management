-- Role Assignment Fixes - Run this in Supabase SQL Editor
-- This fixes the trigger to properly handle role assignment timing

-- Step 1: Update trigger to handle role assignment from callback correctly
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Comprehensive logging
    RAISE NOTICE '=== UPDATED SYNC_USER_ROLE TRIGGER START ===';
    RAISE NOTICE 'User ID: %', NEW.id;
    RAISE NOTICE 'User Email: %', NEW.email;
    RAISE NOTICE 'Raw User Metadata: %', NEW.raw_user_meta_data;
    
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
        -- CRITICAL FIX: Check for role in multiple places with proper priority
        -- 1. Check raw_user_meta_data first (from callback)
        -- 2. Check app_metadata (from updateUser)
        -- 3. Default to 'User'
        BEGIN
            user_database_role := COALESCE(
                NEW.raw_user_meta_data->>'database_role',  -- From callback manual insert
                NEW.raw_user_meta_data->>'role',           -- From OAuth role_hint
                NEW.app_metadata->>'database_role',         -- From updateUser (if exists)
                NEW.app_metadata->>'role',                 -- From updateUser (if exists)
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
        
        -- Safely extract name from raw_user_meta_data ONLY
        BEGIN
            user_name := COALESCE(
                NEW.raw_user_meta_data->>'name',
                NEW.raw_user_meta_data->>'full_name',
                NEW.raw_user_meta_data->>'user_name',
                NEW.email,
                'Unknown User'
            );
            RAISE NOTICE 'Extracted name: %', user_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error extracting name: %, using fallback', SQLERRM;
                user_name := COALESCE(NEW.email, 'Unknown User');
        END;
        
        -- Safely extract is_guest flag from raw_user_meta_data ONLY
        BEGIN
            user_is_guest := COALESCE(
                (NEW.raw_user_meta_data->>'is_guest')::boolean,
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
                        VALUES (NEW.id, user_name, user_database_role, user_email);
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
            RAISE NOTICE '=== UPDATED SYNC_USER_ROLE TRIGGER SUCCESS ===';
        ELSE
            RAISE NOTICE '=== UPDATED SYNC_USER_ROLE TRIGGER FAILED BUT AUTH CONTINUES ===';
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '=== UPDATED SYNC_USER_ROLE TRIGGER CRITICAL ERROR ===';
            RAISE NOTICE 'Critical error: %', SQLERRM;
            -- DO NOT re-raise exception - let auth continue
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Ensure trigger is using updated function
DROP TRIGGER IF EXISTS trigger_sync_user_role ON auth.users;
CREATE TRIGGER trigger_sync_user_role
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_role();

-- ==========================================
-- This fix:
-- 1. Checks both raw_user_meta_data AND app_metadata for roles
-- 2. Prioritizes callback-provided role over defaults
-- 3. Maintains all error handling and fallbacks
-- 4. Should fix role assignment timing issues
-- ==========================================
