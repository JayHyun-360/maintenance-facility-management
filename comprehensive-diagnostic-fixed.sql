-- Comprehensive Diagnostic and Direct Fix
-- Fixed syntax for Supabase SQL Editor

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

-- Step 3: Test basic query without relationships first
SELECT * FROM maintenance_requests ORDER BY created_at DESC;

-- Step 4: Test the relationship query with proper syntax
SELECT 
    mr.*,
    p.full_name,
    p.email,
    p.visual_role
FROM maintenance_requests mr
LEFT JOIN profiles p ON mr.requester_id = p.id
ORDER BY mr.created_at DESC;

-- Step 5: Check if there are any remaining policies
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

-- Step 6: Check if there are any remaining functions that might be called
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name NOT ILIKE 'pg_%'
AND (routine_definition ILIKE '%users%' OR routine_definition ILIKE '%auth%')
ORDER BY routine_name;
