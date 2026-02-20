-- COMPLETE SCHEMA SETUP
-- This script creates all tables and fixes RLS policies
-- Run this if you're getting "relation does not exist" errors

-- ==========================================
-- STEP 1: CREATE ALL TABLES
-- ==========================================

-- Create maintenance_requests table (if not exists)
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    requester_name TEXT NOT NULL,
    facility_id UUID REFERENCES facilities(id),
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Rejected')),
    supporting_reasons TEXT,
    action_taken TEXT,
    work_evaluation VARCHAR(20) CHECK (work_evaluation IN ('Outstanding', 'Very Satisfactory', 'Satisfactory', 'Poor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create facilities table (if not exists)
CREATE TABLE IF NOT EXISTS facilities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create notifications table (if not exists)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create profiles table (if not exists)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    database_role TEXT NOT NULL DEFAULT 'User' CHECK (database_role IN ('Admin', 'User')),
    visual_role TEXT CHECK (visual_role IN ('Teacher', 'Staff', 'Student')),
    educational_level TEXT,
    department TEXT,
    is_guest BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- STEP 2: INSERT DEFAULT DATA
-- ==========================================

-- Insert default facilities
INSERT INTO facilities (name, description) VALUES
('Main Building', 'Primary academic building with classrooms and offices'),
('Science Building', 'Science laboratories and research facilities'),
('Library', 'Main library and study areas'),
('Gymnasium', 'Sports and physical education facilities'),
('Cafeteria', 'Dining hall and food services'),
('Administration', 'Administrative offices and reception'),
('Auditorium', 'Main auditorium and performance space'),
('Technology Building', 'Computer labs and IT facilities')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- STEP 3: ENABLE RLS ON ALL TABLES
-- ==========================================

ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 4: CREATE INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_category ON maintenance_requests(category);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_evaluator ON maintenance_requests(work_evaluation);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_requester_id ON maintenance_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_database_role ON profiles(database_role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_guest ON profiles(is_guest);

-- ==========================================
-- STEP 5: CREATE CORRECTED RLS POLICIES
-- ==========================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

DROP POLICY IF EXISTS "Users can view their own requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can insert their own requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON maintenance_requests;

DROP POLICY IF EXISTS "Facilities are viewable by everyone" ON facilities;
DROP POLICY IF EXISTS "Only admins can manage facilities" ON facilities;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON notifications;

-- Create corrected RLS policies using circuit breaker pattern

-- Profiles policies
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

-- Maintenance requests policies
CREATE POLICY "Users can view their own requests" ON maintenance_requests
    FOR SELECT USING (requester_id = auth.uid());

CREATE POLICY "Admins can view all requests" ON maintenance_requests
    FOR SELECT USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

CREATE POLICY "Users can insert their own requests" ON maintenance_requests
    FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Admins can update all requests" ON maintenance_requests
    FOR UPDATE USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

-- Facilities policies
CREATE POLICY "Facilities are viewable by everyone" ON facilities
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage facilities" ON facilities
    FOR ALL USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notifications" ON notifications
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all notifications" ON notifications
    FOR ALL USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

-- ==========================================
-- STEP 6: CREATE TRIGGERS AND FUNCTIONS
-- ==========================================

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS trigger_sync_user_role ON auth.users;
DROP TRIGGER IF EXISTS trigger_notify_new_request ON maintenance_requests;
DROP TRIGGER IF EXISTS trigger_notify_request_completion ON maintenance_requests;
DROP FUNCTION IF EXISTS sync_user_role() CASCADE;
DROP FUNCTION IF EXISTS notify_new_request() CASCADE;
DROP FUNCTION IF EXISTS notify_request_completion() CASCADE;

-- Create user role sync function
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Update app_metadata to ensure JWT has the role
    UPDATE auth.users 
    SET app_metadata = jsonb_set(
        COALESCE(app_metadata, '{}'),
        '{role}',
        to_jsonb(LOWER(COALESCE(
            NEW.raw_user_meta_data->>'database_role',
            NEW.raw_user_meta_data->>'role',
            'user'
        )))
    )
    WHERE id = NEW.id;
    
    -- Update or create profile
    INSERT INTO profiles (id, full_name, database_role, email, is_guest)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'Unknown User'),
        COALESCE(NEW.raw_user_meta_data->>'database_role', 'User'),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'is_guest')::boolean, FALSE)
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        database_role = EXCLUDED.database_role,
        email = EXCLUDED.email,
        is_guest = EXCLUDED.is_guest,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create notification functions
CREATE OR REPLACE FUNCTION notify_new_request()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify all admins
    INSERT INTO notifications (user_id, title, message, type, metadata)
    SELECT 
        p.id,
        'New Maintenance Request',
        'A new maintenance request has been submitted: ' || NEW.description,
        'info',
        jsonb_build_object('request_id', NEW.id, 'requester', NEW.requester_name)
    FROM profiles p
    WHERE p.database_role = 'Admin'
    AND p.id != NEW.requester_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_request_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify the requester
    INSERT INTO notifications (user_id, title, message, type, metadata)
    VALUES (
        NEW.requester_id,
        'Request Completed',
        'Your maintenance request has been completed: ' || NEW.description,
        'success',
        jsonb_build_object('request_id', NEW.id, 'status', NEW.status)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_sync_user_role
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_role();

CREATE TRIGGER trigger_notify_new_request
    AFTER INSERT ON maintenance_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_request();

CREATE TRIGGER trigger_notify_request_completion
    AFTER UPDATE ON maintenance_requests
    FOR EACH ROW
    WHEN (OLD.status != 'Completed' AND NEW.status = 'Completed')
    EXECUTE FUNCTION notify_request_completion();

-- ==========================================
-- STEP 7: CREATE UTILITY FUNCTIONS
-- ==========================================

-- Function to set user roles
CREATE OR REPLACE FUNCTION set_user_role(user_email TEXT, new_role TEXT)
RETURNS TEXT AS $$
DECLARE
    target_user_id UUID;
    normalized_role TEXT;
BEGIN
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RETURN 'User not found: ' || user_email;
    END IF;
    
    normalized_role := CASE 
        WHEN LOWER(new_role) IN ('admin', 'administrator') THEN 'Admin'
        ELSE 'User'
    END;
    
    UPDATE auth.users 
    SET 
        raw_user_meta_data = jsonb_set(
            COALESCE(raw_user_meta_data, '{}'),
            '{database_role}',
            to_jsonb(normalized_role)
        ),
        app_metadata = jsonb_set(
            COALESCE(app_metadata, '{}'),
            '{role}',
            to_jsonb(LOWER(normalized_role))
        )
    WHERE id = target_user_id;
    
    INSERT INTO profiles (id, database_role)
    VALUES (target_user_id, normalized_role)
    ON CONFLICT (id) DO UPDATE SET
        database_role = normalized_role,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN 'Role updated successfully for ' || user_email || ' to ' || normalized_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Debug function
CREATE OR REPLACE FUNCTION debug_user_auth(user_email TEXT)
RETURNS TABLE(
    step TEXT,
    details JSONB
) AS $$
DECLARE
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RETURN QUERY SELECT 'error'::TEXT, jsonb_build_object('message', 'User not found')::JSONB;
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        'auth_user'::TEXT,
        jsonb_build_object(
            'id', u.id,
            'email', u.email,
            'raw_user_meta_data', u.raw_user_meta_data,
            'app_metadata', u.app_metadata
        )::JSONB
    FROM auth.users u
    WHERE u.id = target_user_id;
    
    RETURN QUERY
    SELECT 
        'profile'::TEXT,
        jsonb_build_object(
            'id', p.id,
            'full_name', p.full_name,
            'database_role', p.database_role,
            'is_guest', p.is_guest
        )::JSONB
    FROM profiles p
    WHERE p.id = target_user_id;
    
    RETURN QUERY
    SELECT 
        'jwt_simulation'::TEXT,
        jsonb_build_object(
            'role', (auth.jwt() ->> 'role'),
            'email', (auth.jwt() ->> 'email')
        )::JSONB;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STEP 8: GRANT PERMISSIONS
-- ==========================================

GRANT ALL ON maintenance_requests TO authenticated;
GRANT ALL ON facilities TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION debug_user_auth TO authenticated;

-- ==========================================
-- COMPLETE! Your database is now properly set up.
-- Try logging in again via Google OAuth or email.
-- ==========================================
