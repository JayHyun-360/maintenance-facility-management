-- Check if test accounts exist in auth.users
SELECT id, email, created_at, raw_user_meta_data 
FROM auth.users 
WHERE email IN ('AdminTest@gmail.com', 'UserTest@gmail.com') 
ORDER BY created_at DESC;
