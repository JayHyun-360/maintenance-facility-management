-- Add First Login Tracking for Conditional hCaptcha
-- Track first login completion and user types for smart captcha display

-- Add columns to profiles table for tracking
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_login_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'guest',
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Create function to update login statistics
CREATE OR REPLACE FUNCTION update_login_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update login count
    UPDATE profiles 
    SET login_count = COALESCE(login_count, 0) + 1
    WHERE id = NEW.id;
    
    -- Set user type based on authentication method
    IF NEW.raw_user_meta_data->>'is_guest' = 'true' THEN
        UPDATE profiles SET user_type = 'guest' WHERE id = NEW.id;
    ELSIF NEW.raw_user_meta_data->>'role' = 'Admin' THEN
        UPDATE profiles SET user_type = 'admin' WHERE id = NEW.id;
    ELSE
        UPDATE profiles SET user_type = 'user' WHERE id = NEW.id;
    END IF;
    
    -- Mark first login as completed (will be set to true after first successful captcha)
    IF profiles.first_login_completed = FALSE THEN
        -- Don't auto-mark, let frontend control this after successful captcha
        NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for login tracking
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION update_login_stats();

-- Create function to mark first login as completed
CREATE OR REPLACE FUNCTION complete_first_login(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE profiles 
    SET first_login_completed = TRUE 
    WHERE id = user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION complete_first_login TO authenticated;
GRANT EXECUTE ON FUNCTION update_login_stats TO authenticated;

-- Verify table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('first_login_completed', 'user_type', 'login_count')
ORDER BY ordinal_position;
