-- Comprehensive Diagnostic and Direct Fix
-- Let's try a more aggressive approach

-- Step 1: Check if RLS is actually enabled on maintenance_requests
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'maintenance_requests';

-- Step 2: Temporarily disable RLS completely to isolate the issue
ALTER TABLE maintenance_requests DISABLE ROW LEVEL SECURITY;

-- Step 3: Test the exact query that the application uses
SELECT *, requester:profiles(full_name, email, visual_role) 
FROM maintenance_requests 
ORDER BY created_at DESC;

-- Step 4: Check if there are any remaining policies
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
WHERE schemaname = 'public' 
AND tablename = 'maintenance_requests';

-- Step 5: Check if there are any remaining functions that might be called
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name NOT ILIKE 'pg_%'
AND (routine_definition ILIKE '%users%' OR routine_definition ILIKE '%auth%')
ORDER BY routine_name;
