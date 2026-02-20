-- Phase 9: Add Guest Flag to Profiles Table

-- Add is_guest column to distinguish guest users from regular users
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE;

-- Update RLS policies to handle the new column
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Update trigger to handle is_guest flag
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profiles table when user metadata changes
    UPDATE profiles 
    SET 
        database_role = COALESCE(NEW.raw_user_meta_data->>'database_role', 'User'),
        full_name = COALESCE(NEW.raw_user_meta_data->>'name', profiles.full_name),
        is_guest = COALESCE((NEW.raw_user_meta_data->>'is_guest')::boolean, profiles.is_guest, FALSE),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
    
    -- If no profile exists, create one
    IF NOT FOUND THEN
        INSERT INTO profiles (id, full_name, database_role, email, is_guest)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
            COALESCE(NEW.raw_user_meta_data->>'database_role', 'User'),
            NEW.email,
            COALESCE((NEW.raw_user_meta_data->>'is_guest')::boolean, FALSE)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create index for better guest user queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_guest ON profiles(is_guest);
