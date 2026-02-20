-- Phase 12: Combined Safe Migration (Phase 9 + Phase 11 improvements)
-- This replaces Phase 9, 10, and 11 with a single safe migration

-- Step 1: Add is_guest column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE;

-- Step 2: Update RLS policies to handle the new column
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Step 3: Create index for better guest user queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_guest ON profiles(is_guest);

-- Step 4: Drop existing trigger and function completely
DROP TRIGGER IF EXISTS trigger_sync_user_role ON auth.users;
DROP TRIGGER IF EXISTS on_profile_role_sync ON profiles;
DROP FUNCTION IF EXISTS sync_user_role() CASCADE;

-- Step 5: Create ultra-resilient trigger function with maximum error handling
-- NOTE: This is now replaced by fix-authentication-issues.sql
-- The new trigger checks user_metadata first (critical fix)
-- See fix-authentication-issues.sql for the updated trigger function

-- Step 6: Recreate trigger (will be recreated by fix-authentication-issues.sql)
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
