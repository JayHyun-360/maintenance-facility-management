-- Check profiles table structure (should NOT have user_id column)
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Check if trigger exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user'
LIMIT 1;

-- Check trigger definition
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
