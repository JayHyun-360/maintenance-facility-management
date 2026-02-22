-- Phase 1: Base Profiles Table Creation
-- This migration creates the fundamental profiles table that was missing

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    database_role VARCHAR(20) DEFAULT 'User' CHECK (database_role IN ('Admin', 'User')),
    visual_role VARCHAR(20) CHECK (visual_role IN ('Teacher', 'Staff', 'Student')),
    educational_level VARCHAR(20),
    department TEXT,
    is_guest BOOLEAN DEFAULT FALSE,
    first_login_completed BOOLEAN DEFAULT FALSE,
    user_type VARCHAR(20) DEFAULT 'guest',
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_database_role ON profiles(database_role);
CREATE INDEX IF NOT EXISTS idx_profiles_visual_role ON profiles(visual_role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_guest ON profiles(is_guest);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create new RLS policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.user_metadata->>'database_role' = 'Admin' 
                 OR auth.users.app_metadata->>'role' = 'Admin')
        )
    );

-- Create trigger function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to complete first login
CREATE OR REPLACE FUNCTION complete_first_login(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE profiles 
    SET first_login_completed = TRUE,
        login_count = COALESCE(login_count, 0) + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$;

-- Create function to wait for profile sync
CREATE OR REPLACE FUNCTION wait_for_profile_sync(user_id UUID, max_attempts INTEGER DEFAULT 10)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    attempts INTEGER := 0;
    profile_exists BOOLEAN := FALSE;
BEGIN
    WHILE attempts < max_attempts AND NOT profile_exists LOOP
        -- Check if profile exists and is properly synced
        SELECT EXISTS(
            SELECT 1 FROM profiles 
            WHERE id = user_id 
            AND database_role IS NOT NULL
        ) INTO profile_exists;
        
        IF NOT profile_exists THEN
            -- Wait 200ms before retrying
            PERFORM pg_sleep(0.2);
            attempts := attempts + 1;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'synced', profile_exists,
        'attempts', attempts,
        'user_id', user_id
    );
END;
$$;

-- Create function to update user role
CREATE OR REPLACE FUNCTION update_user_role(user_id UUID, new_role VARCHAR(20))
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE profiles 
    SET database_role = new_role,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$;
