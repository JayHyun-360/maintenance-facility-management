-- Admin RLS Policies - Run this in Supabase SQL Editor
-- This creates proper RLS policies for Admin access to maintenance_requests and facilities

-- Step 1: Enable RLS on both tables if not already enabled
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view maintenance_requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can create maintenance_requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can update their own maintenance_requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Admins can manage all maintenance_requests" ON maintenance_requests;

DROP POLICY IF EXISTS "Users can view facilities" ON facilities;
DROP POLICY IF EXISTS "Users can create facilities" ON facilities;
DROP POLICY IF EXISTS "Users can update facilities" ON facilities;
DROP POLICY IF EXISTS "Admins can manage all facilities" ON facilities;

-- Step 3: Create Admin policies for maintenance_requests
CREATE POLICY "Admins can view all maintenance_requests" ON maintenance_requests
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() -> 'user_metadata' ->> 'database_role' = 'Admin'
    );

CREATE POLICY "Admins can create maintenance_requests" ON maintenance_requests
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() -> 'user_metadata' ->> 'database_role' = 'Admin'
    );

CREATE POLICY "Admins can update all maintenance_requests" ON maintenance_requests
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() -> 'user_metadata' ->> 'database_role' = 'Admin'
    );

CREATE POLICY "Admins can delete all maintenance_requests" ON maintenance_requests
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() -> 'user_metadata' ->> 'database_role' = 'Admin'
    );

-- Step 4: Create Admin policies for facilities
CREATE POLICY "Admins can view all facilities" ON facilities
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() -> 'user_metadata' ->> 'database_role' = 'Admin'
    );

CREATE POLICY "Admins can create facilities" ON facilities
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() -> 'user_metadata' ->> 'database_role' = 'Admin'
    );

CREATE POLICY "Admins can update all facilities" ON facilities
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() -> 'user_metadata' ->> 'database_role' = 'Admin'
    );

CREATE POLICY "Admins can delete all facilities" ON facilities
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() -> 'user_metadata' ->> 'database_role' = 'Admin'
    );

-- Step 5: Create User policies for maintenance_requests (for regular users)
CREATE POLICY "Users can view their own maintenance_requests" ON maintenance_requests
    FOR SELECT USING (
        auth.uid = user_id
    );

CREATE POLICY "Users can create maintenance_requests" ON maintenance_requests
    FOR INSERT WITH CHECK (
        auth.uid = user_id
    );

CREATE POLICY "Users can update their own maintenance_requests" ON maintenance_requests
    FOR UPDATE USING (
        auth.uid = user_id
    );

-- Step 6: Create User policies for facilities (read-only for regular users)
CREATE POLICY "Users can view active facilities" ON facilities
    FOR SELECT USING (
        is_active = true
    );

-- ==========================================
-- This creates:
-- 1. Full Admin access (SELECT, INSERT, UPDATE, DELETE) to both tables
-- 2. User access to their own maintenance_requests
-- 3. User read-only access to active facilities
-- 4. Proper JWT role checking using both role and database_role
-- ==========================================
