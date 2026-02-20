-- Phase 8: Profiles Table Schema & RLS Policies Fix

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    database_role TEXT NOT NULL DEFAULT 'User' CHECK (database_role IN ('Admin', 'User')),
    visual_role TEXT CHECK (visual_role IN ('Teacher', 'Staff', 'Student')),
    educational_level TEXT,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Create RLS policies following the circuit breaker pattern
-- IMPORTANT: Never query profiles table in RLS policies to check roles

CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

CREATE POLICY "Admins can manage all profiles" ON profiles
    FOR ALL USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

-- Create trigger to sync database_role from auth metadata to profiles table
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profiles table when user metadata changes
    UPDATE profiles 
    SET 
        database_role = COALESCE(NEW.raw_user_meta_data->>'database_role', 'User'),
        full_name = COALESCE(NEW.raw_user_meta_data->>'name', profiles.full_name),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
    
    -- If no profile exists, create one
    IF NOT FOUND THEN
        INSERT INTO profiles (id, full_name, database_role, email)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
            COALESCE(NEW.raw_user_meta_data->>'database_role', 'User'),
            NEW.email
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync role on user creation/update
DROP TRIGGER IF EXISTS trigger_sync_user_role ON auth.users;
CREATE TRIGGER trigger_sync_user_role
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_role();

-- Create function to update JWT metadata with database role
CREATE OR REPLACE FUNCTION update_user_role(user_id UUID, new_role TEXT)
RETURNS VOID AS $$
BEGIN
    -- Update app_metadata in auth.users
    UPDATE auth.users 
    SET app_metadata = jsonb_set(
        COALESCE(app_metadata, '{}'),
        '{role}',
        to_jsonb(LOWER(new_role))
    )
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_database_role ON profiles(database_role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
