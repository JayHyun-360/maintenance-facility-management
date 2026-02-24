-- Test script to verify OAuth user creation fix
-- Run this in Supabase SQL Editor to test the fix

-- 1. Check if the trigger function exists and is properly configured
SELECT 
    proname as function_name,
    pronargs as arg_count,
    prosecdef as security_definer,
    prolang::regproc as language
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 2. Check if the trigger exists
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name,
    tgtype as trigger_type
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 3. Check RLS policies on profiles table
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 4. Test the debug function (this will return empty rows since no user exists yet)
SELECT * FROM public.debug_user_creation('00000000-0000-0000-0000-000000000000'::uuid);

-- 5. Check if we can manually create a test user to verify the trigger works
-- (This is just for testing - don't run in production unless needed)
/*
-- Test trigger with a mock user insertion
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    raw_app_metadata
) VALUES (
    gen_random_uuid(),
    'test@example.com',
    'mock_password',
    now(),
    now(),
    now(),
    '{"full_name": "Test User", "database_role": "user"}'::jsonb,
    '{}'::jsonb
);
*/
