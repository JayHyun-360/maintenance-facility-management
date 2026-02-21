-- Create Missing Tables - Run this in Supabase SQL Editor
-- This creates the facilities table and any other missing tables

-- Step 1: Create facilities table (if not exists)
CREATE TABLE IF NOT EXISTS facilities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create notifications table (if not exists)
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

-- Step 3: Add some sample facilities (if table is empty)
INSERT INTO facilities (name, description, is_active) VALUES
    ('Main Building', 'Primary administrative building', true),
    ('Science Laboratory', 'Science and research facilities', true),
    ('Library', 'Main library and study areas', true),
    ('Gymnasium', 'Sports and recreation facilities', true),
    ('Cafeteria', 'Food services and dining area', true)
ON CONFLICT (name) DO NOTHING;

-- Step 4: Verify tables were created
SELECT 
    'table_verification'::TEXT as step,
    schemaname,
    tablename,
    'created'::TEXT as status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('facilities', 'notifications', 'maintenance_requests', 'profiles')
ORDER BY tablename;

-- Step 5: Verify sample facilities data
SELECT 
    'sample_data'::TEXT as step,
    id,
    name,
    description,
    is_active,
    created_at
FROM facilities 
ORDER BY created_at;

-- ==========================================
-- This creates:
-- 1. The missing facilities table
-- 2. The notifications table (if missing)
-- 3. Sample facilities data for testing
-- 4. Verification of table creation
-- ==========================================
