-- Final working version - Simple and reliable trigger system

-- Step 1: Create auth_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create index for auth_logs
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_action ON auth_logs(user_id, action);

-- Step 3: Create trigger function
CREATE OR REPLACE FUNCTION sync_user_role_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Simple UPDATE statement
    UPDATE profiles 
    SET database_role = 
        CASE 
            WHEN NEW.app_metadata->>'role' = 'admin' THEN 'Admin'
            ELSE 'User'
        END
    WHERE id = NEW.id;
    
    -- Log the role assignment
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
    
    RETURN NEW;
END;
$$;

-- Step 4: Create trigger that calls the function
DROP TRIGGER IF EXISTS trigger_sync_user_role ON auth.users;
CREATE TRIGGER trigger_sync_user_role
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_role_trigger();
