-- Database Verification Script
-- Check if profiles table exists and has data

-- 1. Check profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if profiles table has any data
SELECT 
    COUNT(*) as profile_count,
    COUNT(CASE WHEN database_role = 'Admin' THEN 1 END) as admin_count,
    COUNT(CASE WHEN database_role = 'User' THEN 1 END) as user_count,
    COUNT(CASE WHEN is_guest = TRUE THEN 1 END) as guest_count
FROM profiles;

-- 3. Check RLS policies on profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 4. Check if functions exist
SELECT 
    proname,
    prorettype::regtype as return_type,
    prosrc as source
FROM pg_proc 
WHERE proname IN ('complete_first_login', 'wait_for_profile_sync', 'update_user_role')
    AND pronamespace = 'public';

-- 5. Sample profile data (if any)
SELECT 
    id,
    full_name,
    email,
    database_role,
    visual_role,
    is_guest,
    first_login_completed,
    created_at
FROM profiles 
LIMIT 5;
