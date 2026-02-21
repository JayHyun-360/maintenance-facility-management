-- Remove Problematic Functions That Reference auth.users
-- These functions violate the circuit breaker pattern

-- Step 1: Drop all problematic functions
DROP FUNCTION IF EXISTS update_user_role CASCADE;
DROP FUNCTION IF EXISTS debug_auth_complete CASCADE;
DROP FUNCTION IF EXISTS debug_auth_flow CASCADE;
DROP FUNCTION IF EXISTS set_user_role CASCADE;

-- Step 2: Verify functions are removed
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name NOT ILIKE 'pg_%'
ORDER BY routine_name;
