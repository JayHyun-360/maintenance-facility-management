-- Comprehensive Search for Any References to 'users' Table
-- This will find ALL functions, triggers, and policies that reference users table

-- Step 1: Check all functions for users table references
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition ILIKE '%users%'
AND routine_schema = 'public';

-- Step 2: Check all triggers for users table references  
SELECT 
    trigger_name,
    event_manipulation_table,
    action_timing,
    action_condition,
    action_statement
FROM information_schema.triggers 
WHERE action_statement ILIKE '%users%'
AND trigger_schema = 'public';

-- Step 3: Check all RLS policies again for any users references we missed
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
AND (qual ILIKE '%users%' OR with_check ILIKE '%users%')
ORDER BY tablename, policyname;

-- Step 4: Check if there are any views that reference users
SELECT 
    table_name,
    view_definition
FROM information_schema.views 
WHERE view_definition ILIKE '%users%'
AND table_schema = 'public';
