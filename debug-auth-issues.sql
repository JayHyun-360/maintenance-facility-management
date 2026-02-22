-- Debug Current Authentication Issues
-- Check what's happening with auth system

-- 1. Check if there are any recent authentication errors
SELECT 
    'recent_auth_logs' as info_type,
    json_build_object(
        'total_logs', (SELECT COUNT(*) FROM auth_logs WHERE timestamp > NOW() - INTERVAL '1 hour'),
        'recent_errors', (
            SELECT json_agg(
                json_build_object(
                    'user_id', user_id,
                    'action', action,
                    'metadata', metadata,
                    'timestamp', timestamp
                )
            )
            FROM auth_logs 
            WHERE timestamp > NOW() - INTERVAL '1 hour'
            AND action LIKE '%error%'
            LIMIT 5
        )
    ) as data;

-- 2. Check if profiles table has any data at all
SELECT 
    'profiles_data_check' as info_type,
    json_build_object(
        'table_exists', (
            SELECT COUNT(*) > 0 
            FROM information_schema.tables 
            WHERE table_name = 'profiles' AND table_schema = 'public'
        ),
        'has_data', (SELECT COUNT(*) > 0 FROM profiles),
        'sample_data', (
            SELECT json_agg(
                json_build_object(
                    'id', id,
                    'email', email,
                    'database_role', database_role,
                    'is_guest', is_guest,
                    'created_at', created_at
                )
            )
            FROM profiles 
            LIMIT 3
        )
    ) as data;

-- 3. Check if RLS policies are working correctly
SELECT 
    'rls_check' as info_type,
    json_build_object(
        'profiles_policies_count', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles'),
        'maintenance_requests_policies_count', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'maintenance_requests'),
        'facilities_policies_count', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'facilities')
    ) as data;

-- 4. Check auth.users table structure (what columns actually exist)
SELECT 
    'auth_users_structure' as info_type,
    json_build_object(
        'columns', (
            SELECT json_agg(
                json_build_object(
                    'column_name', column_name,
                    'data_type', data_type
                )
            )
            FROM information_schema.columns 
            WHERE table_name = 'users' AND table_schema = 'auth'
            ORDER BY ordinal_position
        )
    ) as data;
