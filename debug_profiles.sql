-- Debug script to check profiles table
SELECT 
    id,
    full_name,
    database_role,
    visual_role,
    is_anonymous,
    created_at,
    raw_user_meta_data
FROM public.profiles 
ORDER BY created_at DESC;

-- Check auth.users table for test accounts
SELECT 
    id,
    email,
    created_at,
    raw_user_meta_data,
    raw_app_metadata
FROM auth.users 
WHERE email LIKE '%test%' OR email LIKE '%Test%'
ORDER BY created_at DESC;
