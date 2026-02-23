-- ==========================================
-- Check Authentication Setup
-- ==========================================

-- Check if there are any existing OAuth users without profiles
SELECT 
    au.id,
    au.email,
    au.created_at,
    CASE 
        WHEN p.id IS NOT NULL THEN 'Has Profile'
        ELSE 'Missing Profile'
    END as profile_status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email IS NOT NULL
ORDER BY au.created_at DESC;

-- Check trigger function behavior
SELECT 
    proname,
    prosrc
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Verify RLS policies on profiles
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY policyname;
