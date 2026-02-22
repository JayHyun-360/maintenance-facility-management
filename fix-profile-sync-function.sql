-- Fix wait_for_profile_sync function that might be causing issues
-- Create a simpler version that doesn't have return type conflicts

DROP FUNCTION IF EXISTS wait_for_profile_sync(user_id UUID, max_attempts INTEGER);

CREATE OR REPLACE FUNCTION wait_for_profile_sync(user_id UUID, max_attempts INTEGER DEFAULT 10)
RETURNS TABLE(
    synced BOOLEAN,
    attempts INTEGER,
    user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_attempts INTEGER := 0;
    profile_exists BOOLEAN := FALSE;
BEGIN
    WHILE current_attempts < max_attempts AND NOT profile_exists LOOP
        -- Check if profile exists and is properly synced
        SELECT EXISTS(
            SELECT 1 FROM profiles 
            WHERE id = user_id 
            AND database_role IS NOT NULL
        ) INTO profile_exists;
        
        IF NOT profile_exists THEN
            -- Wait 200ms before retrying
            PERFORM pg_sleep(0.2);
            current_attempts := current_attempts + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT 
        profile_exists as synced,
        current_attempts as attempts,
        user_id;
END;
$$;
