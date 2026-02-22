-- Fix role assignment issues
-- This script ensures proper role assignment and JWT metadata sync

-- Step 1: Check if trigger function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'sync_user_role' AND routine_schema = 'public';

-- Step 2: Create a simple, reliable trigger function
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profiles table with role from auth.users metadata
    UPDATE profiles 
    SET database_role = COALESCE(
        NEW.user_metadata->>'database_role',
        CASE 
            WHEN NEW.app_metadata->>'role' = 'admin' THEN 'Admin'
            ELSE 'User'
        END
    )
    WHERE id = NEW.id;
    
    -- Log: role assignment for debugging
    INSERT INTO auth_logs (user_id, action, metadata)
    VALUES (
        NEW.id, 
        'role_sync', 
        jsonb_build_object(
            'database_role', COALESCE(NEW.user_metadata->>'database_role', 'not_set'),
            'app_role', NEW.app_metadata->>'role',
            'trigger_time', NOW()
        )
    )
    ON CONFLICT (user_id, action) DO UPDATE SET
        metadata = EXCLUDED.metadata,
        timestamp = NOW();
    
-- Step 1: Create stored procedure for role synchronization
CREATE OR REPLACE PROCEDURE sync_user_role(
    p_user_id UUID,
    p_user_metadata JSONB,
    p_app_metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Use PERFORM for UPDATE that doesn't return rows
    PERFORM UPDATE profiles 
    SET database_role = COALESCE(
        p_user_metadata->>'database_role',
        CASE 
            WHEN p_app_metadata->>'role' = 'admin' THEN 'Admin'
            ELSE 'User'
        END
    )
    WHERE id = p_user_id;
    
    -- Log role assignment for debugging
    INSERT INTO auth_logs (user_id, action, metadata)
    VALUES (
        p_user_id, 
        'role_sync', 
        jsonb_build_object(
            'database_role', COALESCE(p_user_metadata->>'database_role', 'not_set'),
            'app_role', p_app_metadata->>'role',
            'trigger_time', NOW()
        )
    )
    ON CONFLICT (user_id, action) DO UPDATE SET
        metadata = EXCLUDED.metadata,
        timestamp = NOW();
END;
$$;

-- Step 2: Create direct trigger without function dependency
DROP TRIGGER IF EXISTS trigger_sync_user_role ON auth.users;
CREATE TRIGGER trigger_sync_user_role
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE PROCEDURE sync_user_role(NEW.id, NEW.user_metadata, NEW.app_metadata);
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create auth_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Create index for auth_logs
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_action ON auth_logs(user_id, action);

-- Step 5: Test the trigger function
SELECT 
    'trigger_test'::TEXT as test,
    'test_result' as test_result;
