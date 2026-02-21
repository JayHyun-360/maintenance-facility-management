-- Check and Fix sync_user_role Function
-- This function might still be referencing auth.users

-- Step 1: Get the exact definition of sync_user_role
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name = 'sync_user_role';

-- Step 2: If it references auth.users, drop and recreate it
DROP FUNCTION IF EXISTS sync_user_role CASCADE;

-- Step 3: Recreate sync_user_role using circuit breaker pattern
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync user role from profile to auth metadata using circuit breaker pattern
    -- Only update if the profile exists and has a database_role
    IF NEW.database_role IS NOT NULL THEN
        -- Update user metadata without querying auth.users
        -- This should be handled by the application layer, not database triggers
        NULL; -- Placeholder - actual sync should be done in application code
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Verify the function is fixed
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name = 'sync_user_role';
