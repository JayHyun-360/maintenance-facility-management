-- Quick Database Status Check
-- This will show us the current state of the profiles table

-- Check if profiles table exists and basic stats
SELECT 
    'profiles_table_stats' as info_type,
    json_build_object(
        'total_profiles', (SELECT COUNT(*) FROM profiles),
        'admin_profiles', (SELECT COUNT(*) FROM profiles WHERE database_role = 'Admin'),
        'user_profiles', (SELECT COUNT(*) FROM profiles WHERE database_role = 'User'),
        'guest_profiles', (SELECT COUNT(*) FROM profiles WHERE is_guest = TRUE),
        'completed_first_login', (SELECT COUNT(*) FROM profiles WHERE first_login_completed = TRUE)
    ) as data;

-- Check if RLS policies are active
SELECT 
    'rls_policies' as info_type,
    json_build_object(
        'policy_count', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles'),
        'policies', (
            SELECT json_agg(
                json_build_object(
                    'policy_name', policyname,
                    'command', cmd
                )
            )
            FROM pg_policies 
            WHERE tablename = 'profiles'
        )
    ) as data;

-- Check if required functions exist
SELECT 
    'auth_functions' as info_type,
    json_build_object(
        'complete_first_login_exists', (SELECT COUNT(*) > 0 FROM pg_proc WHERE proname = 'complete_first_login'),
        'wait_for_profile_sync_exists', (SELECT COUNT(*) > 0 FROM pg_proc WHERE proname = 'wait_for_profile_sync'),
        'update_user_role_exists', (SELECT COUNT(*) > 0 FROM pg_proc WHERE proname = 'update_user_role')
    ) as data;
