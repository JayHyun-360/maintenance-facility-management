-- Check if the user exists and what metadata they have
SELECT 
  id,
  email,
  raw_user_meta_data,
  created_at
FROM auth.users 
WHERE email = 'jaydul1744@gmail.com';

-- Check if profile exists for this user
SELECT * FROM public.profiles WHERE id = (
  SELECT id FROM auth.users WHERE email = 'jaydul1744@gmail.com'
);

-- Check if trigger function exists and is working
SELECT proname, prosrc FROM pg_proc WHERE proname = 'handle_new_user';

-- Check trigger status
SELECT tgname, tgenabled, tgrelid::regclass as table_name 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
