-- ==========================================
-- Verify RLS Policies for OAuth User Creation
-- ==========================================

-- 1. Check if RLS is enabled on profiles table
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- 2. Check all policies on profiles table
SELECT 
    policyname,
    permissive,
    roles,
    cmd as command_type,
    qual as using_expression,
    with_check as check_expression
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 3. Test if a new user can insert their own profile
-- This simulates what the trigger should be able to do
DO $$
BEGIN
    -- Create a test user ID (this would normally come from auth.users)
    DECLARE test_user_id UUID := gen_random_uuid();
    
    -- Test INSERT permission (simulating trigger behavior)
    INSERT INTO public.profiles (
        id, 
        full_name, 
        database_role, 
        is_anonymous
    ) VALUES (
        test_user_id,
        'Test User',
        'user',
        false
    );
    
    -- Test SELECT permission
    SELECT * FROM public.profiles WHERE id = test_user_id;
    
    -- Clean up
    DELETE FROM public.profiles WHERE id = test_user_id;
    
    RAISE NOTICE 'RLS policies are working correctly for user creation';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'RLS policy issue detected: %', SQLERRM;
END $$;

-- 4. Check trigger function exists and is properly configured
SELECT 
    proname as function_name,
    prosecdef as security_definer,
    prolang::regproc as language,
    provolatile as volatile_function
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 5. Check trigger exists and is properly attached
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name,
    tgenabled as enabled,
    tgtype as trigger_type
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 6. Verify auth.users table structure for OAuth
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'auth' 
AND table_name = 'users' 
AND column_name IN ('id', 'email', 'raw_user_meta_data', 'raw_app_metadata')
ORDER BY ordinal_position;

-- 7. Test the debug function
SELECT * FROM public.debug_user_creation('00000000-0000-0000-0000-000000000000'::uuid);

-- 8. Check if there are any conflicting policies
-- Look for policies that might block the trigger
SELECT 
    'Profiles Table Policies' as table_name,
    policyname,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING: ' || qual
        WHEN with_check IS NOT NULL THEN 'CHECK: ' || with_check
        ELSE 'No condition'
    END as policy_condition
FROM pg_policies 
WHERE tablename = 'profiles'
UNION ALL
SELECT 
    'Auth Users Table' as table_name,
    'Table Access' as policyname,
    CASE 
        WHEN rowsecurity THEN 'RLS Enabled'
        ELSE 'RLS Disabled'
    END as policy_condition
FROM pg_tables 
WHERE schemaname = 'auth' 
AND tablename = 'users';

-- 9. Verify database role permissions
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND grantee IN ('authenticated', 'anon', 'public')
ORDER BY grantee, privilege_type;
