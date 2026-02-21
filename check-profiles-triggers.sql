-- Check Profiles Table RLS Policies for users references
-- The error might be coming from profiles table policies

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
AND tablename = 'profiles'
ORDER BY policyname;

-- Also check if there are any triggers on maintenance_requests
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    action_condition,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND event_object_table = 'maintenance_requests';

-- Check for any remaining functions that reference users
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition ILIKE '%auth.users%'
AND routine_schema = 'public'
AND routine_name NOT ILIKE 'pg_%';
