-- Debug 500 Error - Run this in Supabase SQL Editor
-- This will help identify the server-side exception

-- Step 1: Check recent auth attempts and their metadata
SELECT 
    'recent_auth_attempts'::TEXT as step,
    id,
    email,
    created_at,
    raw_user_meta_data,
    app_metadata
FROM auth.users 
WHERE created_at > NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Check recent profile creation attempts and any errors
SELECT 
    'recent_profiles'::TEXT as step,
    id,
    full_name,
    database_role,
    email,
    is_guest,
    created_at,
    updated_at
FROM profiles 
WHERE created_at > NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC
LIMIT 5;

-- Step 3: Check for any database constraint violations
SELECT 
    'constraint_violations'::TEXT as step,
    con.conname as constraint_name,
    cls.relname as table_name,
    consrc as constraint_definition
FROM pg_constraint con
JOIN pg_class cls ON con.conrelid = cls.oid
WHERE cls.relname = 'profiles'
AND con.contype = 'c'
ORDER BY con.conname;

-- Step 4: Check trigger function for syntax errors
SELECT 
    'trigger_function_check'::TEXT as step,
    proname as function_name,
    prosrc as function_definition
FROM pg_proc 
WHERE proname = 'sync_user_role';

-- Step 5: Check if RLS policies are causing issues
SELECT 
    'rls_policies'::TEXT as step,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ==========================================
-- Look for:
-- 1. Recent auth attempts and their metadata structure
-- 2. Profile creation attempts and their status
-- 3. Any constraint violations that might cause 500 errors
-- 4. Trigger function syntax or logic errors
-- 5. RLS policies that might be blocking operations
-- ==========================================
