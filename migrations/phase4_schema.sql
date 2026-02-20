-- Phase 4: Physical Form Integration & Facilities Schema Updates

-- Add completion fields to maintenance_requests table
ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS supporting_reasons TEXT,
ADD COLUMN IF NOT EXISTS action_taken TEXT,
ADD COLUMN IF NOT EXISTS work_evaluation VARCHAR(20) CHECK (work_evaluation IN ('Outstanding', 'Very Satisfactory', 'Satisfactory', 'Poor'));

-- Create facilities table for building management
CREATE TABLE IF NOT EXISTS facilities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_category ON maintenance_requests(category);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_evaluator ON maintenance_requests(work_evaluation);

-- Update RLS policies for facilities table
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Facilities are viewable by everyone" ON facilities;
DROP POLICY IF EXISTS "Only admins can manage facilities" ON facilities;

-- Create new RLS policies for facilities
CREATE POLICY "Facilities are viewable by everyone" ON facilities
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage facilities" ON facilities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.user_metadata->>'database_role' = 'Admin' 
                 OR auth.users.app_metadata->>'role' = 'Admin')
        )
    );

-- Update RLS policy for maintenance_requests to include new fields
DROP POLICY IF EXISTS "Users can view their own requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can insert their own requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON maintenance_requests;

CREATE POLICY "Users can view their own requests" ON maintenance_requests
    FOR SELECT USING (requester_id = auth.uid());

CREATE POLICY "Admins can view all requests" ON maintenance_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.user_metadata->>'database_role' = 'Admin' 
                 OR auth.users.app_metadata->>'role' = 'Admin')
        )
    );

CREATE POLICY "Users can insert their own requests" ON maintenance_requests
    FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Admins can update all requests" ON maintenance_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.user_metadata->>'database_role' = 'Admin' 
                 OR auth.users.app_metadata->>'role' = 'Admin')
        )
    );
