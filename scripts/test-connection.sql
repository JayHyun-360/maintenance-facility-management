-- Test connection to Supabase database
-- This file can be used to verify database connectivity

-- Test basic query
SELECT 'Connection successful' as status, NOW() as timestamp;

-- Check if profiles table exists
SELECT 
    table_name as table_exists,
    'profiles' as expected_table
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'profiles';

-- Check current user
SELECT current_user as database_user, version() as postgres_version;
