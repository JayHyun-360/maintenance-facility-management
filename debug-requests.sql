-- Debug script to check maintenance_requests table and RLS policies

-- Check if table exists
SELECT 
    table_name,
    table_type,
    is_insertable_into
FROM information_schema.tables 
WHERE table_name = 'maintenance_requests'
    AND table_schema = 'public';

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'maintenance_requests'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check RLS status
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'maintenance_requests'
    AND schemaname = 'public';

-- Check existing RLS policies
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
WHERE tablename = 'maintenance_requests'
    AND schemaname = 'public';

-- Check if there are any requests in the table
SELECT 
    COUNT(*) as total_requests,
    COUNT(CASE WHEN requester_id IS NOT NULL THEN 1 END) as requests_with_requester
FROM maintenance_requests;

-- Check current user and their role
SELECT 
    auth.uid() as current_user_id,
    auth.jwt() ->> 'database_role' as jwt_database_role,
    auth.jwt() ->> 'role' as jwt_app_role,
    auth.role() as auth_role;
