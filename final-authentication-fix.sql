-- FINAL AUTHENTICATION FIX
-- This script fixes all authentication issues and ensures proper user creation
-- Based on phase12 migration but with critical fixes for login issues

-- ==========================================
-- CRITICAL FIXES FOR AUTHENTICATION
-- ==========================================

-- Step 1: Ensure profiles table exists with correct structure
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    database_role TEXT NOT NULL DEFAULT 'User' CHECK (database_role IN ('Admin', 'User')),
    visual_role TEXT CHECK (visual_role IN ('Teacher', 'Staff', 'Student')),
    educational_level TEXT,
    department TEXT,
    is_guest BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop and recreate all RLS policies with circuit breaker pattern
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Create correct RLS policies using JWT metadata (CIRCUIT BREAKER PATTERN)
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

CREATE POLICY "Admins can manage all profiles" ON profiles
    FOR ALL USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_guest ON profiles(is_guest);
CREATE INDEX IF NOT EXISTS idx_profiles_database_role ON profiles(database_role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Step 5: Drop and recreate the ultra-resilient trigger function
DROP TRIGGER IF EXISTS trigger_sync_user_role ON auth.users;
DROP TRIGGER IF EXISTS on_profile_role_sync ON profiles;
DROP FUNCTION IF EXISTS sync_user_role() CASCADE;

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
        
        -- CRITICAL: Update app_metadata to ensure JWT has the role
        UPDATE auth.users 
        SET app_metadata = jsonb_set(
            COALESCE(app_metadata, '{}'),
            '{role}',
            to_jsonb(LOWER(user_database_role))
        )
        WHERE id = NEW.id;
        
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

-- Step 6: Recreate trigger
CREATE TRIGGER trigger_sync_user_role
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_role();

-- Step 7: Create comprehensive debugging function
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

-- Step 8: Create utility functions for user management
CREATE OR REPLACE FUNCTION set_user_role(user_email TEXT, new_role TEXT)
RETURNS TEXT AS $$
DECLARE
    target_user_id UUID;
    normalized_role TEXT;
BEGIN
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RETURN 'User not found: ' || user_email;
    END IF;
    
    normalized_role := CASE 
        WHEN LOWER(new_role) IN ('admin', 'administrator') THEN 'Admin'
        ELSE 'User'
    END;
    
    UPDATE auth.users 
    SET 
        raw_user_meta_data = jsonb_set(
            COALESCE(raw_user_meta_data, '{}'),
            '{database_role}',
            to_jsonb(normalized_role)
        ),
        app_metadata = jsonb_set(
            COALESCE(app_metadata, '{}'),
            '{role}',
            to_jsonb(LOWER(normalized_role))
        )
    WHERE id = target_user_id;
    
    INSERT INTO profiles (id, database_role)
    VALUES (target_user_id, normalized_role)
    ON CONFLICT (id) DO UPDATE SET
        database_role = normalized_role,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN 'Role updated successfully for ' || user_email || ' to ' || normalized_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION debug_auth_complete TO authenticated;

-- Step 10: Create a test admin user (if you want to create one)
-- Uncomment and modify the email below to create an admin user
/*
DO $$
DECLARE
    admin_email TEXT := 'admin@example.com'; -- Change this to your admin email
    user_id UUID;
BEGIN
    -- Check if user exists
    SELECT id INTO user_id FROM auth.users WHERE email = admin_email;
    
    IF user_id IS NOT NULL THEN
        -- Set as admin
        PERFORM set_user_role(admin_email, 'Admin');
        RAISE NOTICE 'Admin user created/updated: %', admin_email;
    ELSE
        RAISE NOTICE 'User not found: %', admin_email;
        RAISE NOTICE 'Please sign up with this email first, then run this again.';
    END IF;
END $$;
*/

-- ==========================================
-- FINAL SUMMARY
-- ==========================================
-- This script:
-- 1. ✅ Fixes RLS policies using circuit breaker pattern
-- 2. ✅ Creates ultra-resilient trigger function
-- 3. ✅ Ensures JWT metadata is properly set
-- 4. ✅ Handles guest users correctly
-- 5. ✅ Provides debugging tools
-- 6. ✅ Fixes authentication for Google OAuth and email login
-- 
-- After running this script:
-- - Google OAuth login should work
-- - Email login should work
-- - Guest access should work
-- - Admin access should work
-- 
-- To set an existing user as admin:
-- SELECT set_user_role('user@example.com', 'Admin');
-- 
-- To debug authentication issues:
-- SELECT * FROM debug_auth_complete(user_uuid);
-- ==========================================
