-- Fix RLS policies for profiles table
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

-- Create admin policy using profiles table instead of auth.users for simplicity
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        database_role = 'Admin'
    );