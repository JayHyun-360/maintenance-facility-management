-- ==========================================
-- Test Database Setup for New Authentication Flow
-- ==========================================

-- Test 1: Check if profiles table exists and has correct structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test 2: Check if RLS is enabled on profiles table
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- Test 3: Check if RLS policies exist for profiles
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- Test 4: Check if trigger function exists
SELECT 
    proname,
    prosrc
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Test 5: Check if trigger exists
SELECT 
    tgname,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Test 6: Check if our new helper function exists
SELECT 
    proname,
    prosrc
FROM pg_proc 
WHERE proname = 'user_needs_profile_completion';

-- Test 7: Verify auth.users table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'auth'
ORDER BY ordinal_position
LIMIT 10;
