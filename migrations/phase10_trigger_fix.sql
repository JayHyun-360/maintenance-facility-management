-- Phase 10: Fix sync_user_role trigger for Google OAuth compatibility

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_sync_user_role ON auth.users;
DROP FUNCTION IF EXISTS sync_user_role();

-- Create improved trigger function with better error handling
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Log trigger execution for debugging
    RAISE LOG 'sync_user_role trigger executing for user: %', NEW.id;
    
    -- Extract metadata with fallbacks
    DECLARE
        user_database_role TEXT;
        user_name TEXT;
        user_is_guest BOOLEAN;
        user_email TEXT;
    BEGIN
        -- Get database_role from user_metadata (set by auth callback)
        user_database_role := COALESCE(
            NEW.raw_user_meta_data->>'database_role',
            'User' -- Default fallback
        );
        
        -- Get name with fallbacks
        user_name := COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'full_name',
            NEW.email,
            'Unknown User'
        );
        
        -- Get guest flag with safe boolean conversion
        user_is_guest := COALESCE(
            (NEW.raw_user_meta_data->>'is_guest')::boolean,
            FALSE
        );
        
        -- Get email
        user_email := NEW.email;
        
        -- Log extracted values for debugging
        RAISE LOG 'Extracted metadata - role: %, name: %, is_guest: %, email: %', 
            user_database_role, user_name, user_is_guest, user_email;
    END;
    
    -- Try to update existing profile first
    UPDATE profiles 
    SET 
        database_role = user_database_role,
        full_name = user_name,
        is_guest = user_is_guest,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
    
    -- Check if update affected any rows
    IF NOT FOUND THEN
        -- No existing profile, create new one
        BEGIN
            INSERT INTO profiles (id, full_name, database_role, email, is_guest)
            VALUES (
                NEW.id,
                user_name,
                user_database_role,
                user_email,
                user_is_guest
            );
            
            RAISE LOG 'Created new profile for user: %', NEW.id;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE LOG 'Failed to create profile for user %: %', NEW.id, SQLERRM;
                -- Don't re-raise, let auth continue
        END;
    ELSE
        RAISE LOG 'Updated existing profile for user: %', NEW.id;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'sync_user_role trigger failed for user %: %', NEW.id, SQLERRM;
        -- Don't fail the auth process, just log the error
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_sync_user_role
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_role();

-- Add debug function to check trigger status
CREATE OR REPLACE FUNCTION debug_user_profile(user_id UUID)
RETURNS TABLE(
    user_email TEXT,
    user_metadata JSONB,
    app_metadata JSONB,
    profile_exists BOOLEAN,
    profile_role TEXT,
    profile_name TEXT,
    profile_is_guest BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.email,
        u.raw_user_meta_data,
        u.app_metadata,
        (p.id IS NOT NULL) as profile_exists,
        p.database_role,
        p.full_name,
        p.is_guest
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
