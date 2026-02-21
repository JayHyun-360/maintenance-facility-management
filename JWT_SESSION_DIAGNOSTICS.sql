-- JWT Session Diagnostics - Run this in Supabase SQL Editor
-- This will help identify the database/frontend disconnect

-- Step 1: Check current user state and their metadata
SELECT 
    'current_user_state'::TEXT as step,
    u.id as user_id,
    u.email,
    u.created_at,
    u.raw_user_meta_data,
    -- Note: app_metadata doesn't exist in Supabase auth.users
    CASE 
        WHEN u.raw_user_meta_data->>'database_role' = 'Admin' THEN 'Admin'
        ELSE 'User'
    END as effective_role
FROM auth.users u
WHERE u.email = 'jaydul1744@gmail.com';

-- Step 2: Check profiles table for this user
SELECT 
    'profile_state'::TEXT as step,
    p.id,
    p.full_name,
    p.database_role,
    p.visual_role,
    p.is_guest,
    p.created_at,
    p.updated_at
FROM profiles p
WHERE p.email = 'jaydul1744@gmail.com';

-- Step 3: Check RLS policies on profiles table
SELECT 
    'rls_policies'::TEXT as step,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    -- Check if policy references app_metadata (which doesn't exist)
    CASE 
        WHEN qual LIKE '%app_metadata%' THEN 'PROBLEM: References non-existent app_metadata'
        ELSE 'OK: Uses existing columns'
    END as policy_status
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Step 4: Check if trigger is working correctly
SELECT 
    'trigger_status'::TEXT as step,
    tgname as trigger_name,
    tgfoid::regprocedure as function_name,
    tgtype as trigger_type,
    tgenabled as is_enabled
FROM pg_trigger tg
JOIN pg_proc tp ON tg.tgfoid = tp.oid
WHERE tg.tgname = 'trigger_sync_user_role';

-- Step 5: Test manual role update to verify it works
SELECT 
    'manual_test'::TEXT as step,
    set_user_role('jaydul1744@gmail.com', 'Admin') as test_result;

-- ==========================================
-- This will help identify:
-- 1. If user metadata is correctly set in database
-- 2. If profile table reflects the correct role
-- 3. If RLS policies are causing issues
-- 4. If trigger is properly enabled
-- 5. If manual role update actually works
-- ==========================================
