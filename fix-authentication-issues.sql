-- FIX AUTHENTICATION ISSUES
-- This script fixes the RLS policies that are breaking Google OAuth and email login

-- ==========================================
-- PROBLEM IDENTIFIED:
-- Your RLS policies are querying auth.users table to check roles
-- This violates the circuit breaker pattern and causes infinite recursion
-- ==========================================

-- Step 1: Fix Facilities RLS Policies (BREAKING CIRCUIT BREAKER)
DROP POLICY IF EXISTS "Only admins can manage facilities" ON facilities;

CREATE POLICY "Only admins can manage facilities" ON facilities
    FOR ALL USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

-- Step 2: Fix Maintenance Requests RLS Policies (BREAKING CIRCUIT BREAKER)
DROP POLICY IF EXISTS "Admins can view all requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON maintenance_requests;

CREATE POLICY "Admins can view all requests" ON maintenance_requests
    FOR SELECT USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

CREATE POLICY "Admins can update all requests" ON maintenance_requests
    FOR UPDATE USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

-- Step 3: Fix Notifications RLS Policies (ALREADY CORRECT)
-- The notifications policies are already using the correct pattern

-- Step 4: Ensure Profiles RLS Policies are Correct (ALREADY CORRECT from phase8)
-- The profiles policies are already using the correct pattern

-- Step 5: Fix the trigger function to properly sync roles
DROP TRIGGER IF EXISTS trigger_sync_user_role ON auth.users;
DROP FUNCTION IF EXISTS sync_user_role() CASCADE;

CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync role from auth metadata to profiles table
    -- Also update app_metadata to ensure JWT has the role
    UPDATE auth.users 
    SET app_metadata = jsonb_set(
        COALESCE(app_metadata, '{}'),
        '{role}',
        to_jsonb(LOWER(COALESCE(
            NEW.raw_user_meta_data->>'database_role',
            NEW.raw_user_meta_data->>'role',
            'user'
        )))
    )
    WHERE id = NEW.id;
    
    -- Update or create profile
    INSERT INTO profiles (id, full_name, database_role, email, is_guest)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'Unknown User'),
        COALESCE(NEW.raw_user_meta_data->>'database_role', 'User'),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'is_guest')::boolean, FALSE)
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        database_role = EXCLUDED.database_role,
        email = EXCLUDED.email,
        is_guest = EXCLUDED.is_guest,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_sync_user_role
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_role();

-- Step 6: Create function to manually set user roles (for fixing existing users)
CREATE OR REPLACE FUNCTION set_user_role(user_email TEXT, new_role TEXT)
RETURNS TEXT AS $$
DECLARE
    target_user_id UUID;
    normalized_role TEXT;
BEGIN
    -- Find user by email
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RETURN 'User not found: ' || user_email;
    END IF;
    
    -- Normalize role
    normalized_role := CASE 
        WHEN LOWER(new_role) IN ('admin', 'administrator') THEN 'Admin'
        ELSE 'User'
    END;
    
    -- Update auth metadata
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
    
    -- Update profile
    INSERT INTO profiles (id, database_role)
    VALUES (target_user_id, normalized_role)
    ON CONFLICT (id) DO UPDATE SET
        database_role = normalized_role,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN 'Role updated successfully for ' || user_email || ' to ' || normalized_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create debugging function
CREATE OR REPLACE FUNCTION debug_user_auth(user_email TEXT)
RETURNS TABLE(
    step TEXT,
    details JSONB
) AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Find user
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RETURN QUERY SELECT 'error'::TEXT, jsonb_build_object('message', 'User not found')::JSONB;
        RETURN;
    END IF;
    
    -- Return auth user info
    RETURN QUERY
    SELECT 
        'auth_user'::TEXT,
        jsonb_build_object(
            'id', u.id,
            'email', u.email,
            'raw_user_meta_data', u.raw_user_meta_data,
            'app_metadata', u.app_metadata
        )::JSONB
    FROM auth.users u
    WHERE u.id = target_user_id;
    
    -- Return profile info
    RETURN QUERY
    SELECT 
        'profile'::TEXT,
        jsonb_build_object(
            'id', p.id,
            'full_name', p.full_name,
            'database_role', p.database_role,
            'is_guest', p.is_guest
        )::JSONB
    FROM profiles p
    WHERE p.id = target_user_id;
    
    -- Return JWT simulation
    RETURN QUERY
    SELECT 
        'jwt_simulation'::TEXT,
        jsonb_build_object(
            'role', (auth.jwt() ->> 'role'),
            'email', (auth.jwt() ->> 'email')
        )::JSONB;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Grant necessary permissions
GRANT EXECUTE ON FUNCTION set_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION debug_user_auth TO authenticated;

-- ==========================================
-- HOW TO USE:
-- 
-- 1. To fix an existing user's role:
--    SELECT set_user_role('your-email@example.com', 'Admin');
-- 
-- 2. To debug authentication issues:
--    SELECT * FROM debug_user_auth('your-email@example.com');
-- 
-- 3. After running this script, try logging in again
-- ==========================================
