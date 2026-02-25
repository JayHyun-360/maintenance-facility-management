-- 1. Check profiles table has NO user_id column (should return 0)
SELECT COUNT(*) as user_id_column_count FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'user_id';

-- 2. List all columns in profiles table (should NOT include user_id)
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 3. Check trigger exists (should return 1)
SELECT COUNT(*) as trigger_count FROM pg_proc WHERE proname = 'handle_new_user';

-- 4. Verify RLS policies exist (corrected: use policyname not policy_name)
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE tablename IN ('profiles', 'maintenance_requests')
ORDER BY tablename, policyname;

-- 5. Check if any auth.users exist
SELECT COUNT(*) as user_count FROM auth.users;

-- 6. Check if any profiles exist
SELECT COUNT(*) as profile_count FROM public.profiles;
