-- Phase 11: Emergency Trigger Fix with Comprehensive Logging

-- First, let's inspect the current profiles table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    check_clause
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Drop existing trigger and function completely
DROP TRIGGER IF EXISTS trigger_sync_user_role ON auth.users;
DROP FUNCTION IF EXISTS sync_user_role();

-- Create ultra-resilient trigger function with maximum error handling
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Comprehensive logging at every step
    RAISE NOTICE '=== SYNC_USER_ROLE TRIGGER START ===';
    RAISE NOTICE 'User ID: %', NEW.id;
    RAISE NOTICE 'User Email: %', NEW.email;
    RAISE NOTICE 'Raw User Metadata: %', NEW.raw_user_meta_data;
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
        -- Safely extract database_role with multiple fallbacks
        BEGIN
            user_database_role := COALESCE(
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
        
        -- Safely extract name with multiple fallbacks
        BEGIN
            user_name := COALESCE(
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
        
        -- Safely extract is_guest flag
        BEGIN
            user_is_guest := COALESCE(
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

-- Recreate trigger
CREATE TRIGGER trigger_sync_user_role
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_role();

-- Create comprehensive debugging function
CREATE OR REPLACE FUNCTION debug_auth_complete(user_id UUID)
RETURNS TABLE(
    step TEXT,
    details JSONB
) AS $$
BEGIN
    -- Step 1: Check auth.users
    RETURN QUERY
    SELECT 
        'auth_users'::TEXT as step,
        jsonb_build_object(
            'id', u.id,
            'email', u.email,
            'created_at', u.created_at,
            'raw_user_meta_data', u.raw_user_meta_data,
            'app_metadata', u.app_metadata
        ) as details
    FROM auth.users u
    WHERE u.id = user_id;
    
    -- Step 2: Check profiles
    RETURN QUERY
    SELECT 
        'profiles'::TEXT as step,
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
    
    -- Step 3: Check table constraints
    RETURN QUERY
    SELECT 
        'table_constraints'::TEXT as step,
        jsonb_build_object(
            'constraints', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'constraint_name', con.conname,
                        'check_clause', consrc
                    )
                )
                FROM pg_constraint con
                JOIN pg_class cls ON con.conrelid = cls.oid
                WHERE cls.relname = 'profiles'
                AND con.contype = 'c'
            )
        ) as details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
