-- Simplified Admin RLS Policies - Run this in Supabase SQL Editor
-- This creates simple bypass policies for Admin users

-- Step 1: Drop all existing policies
DROP POLICY IF EXISTS "Admins can view all maintenance_requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Admins can create maintenance_requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Admins can update all maintenance_requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Admins can delete all maintenance_requests" ON maintenance_requests;

DROP POLICY IF EXISTS "Admins can view all facilities" ON facilities;
DROP POLICY IF EXISTS "Admins can create facilities" ON facilities;
DROP POLICY IF EXISTS "Admins can update all facilities" ON facilities;
DROP POLICY IF EXISTS "Admins can delete all facilities" ON facilities;

-- Step 2: Create simple Admin bypass policies for maintenance_requests
CREATE POLICY "Admins can do everything maintenance_requests" ON maintenance_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'database_role' = 'Admin'
        )
    );

-- Step 3: Create simple Admin bypass policies for facilities
CREATE POLICY "Admins can do everything facilities" ON facilities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'database_role' = 'Admin'
        )
    );

-- Step 4: Create User policies for maintenance_requests
CREATE POLICY "Users can view their own maintenance_requests" ON maintenance_requests
    FOR SELECT USING (
        auth.uid() = requester_id
    );

CREATE POLICY "Users can create maintenance_requests" ON maintenance_requests
    FOR INSERT WITH CHECK (
        auth.uid() = requester_id
    );

CREATE POLICY "Users can update their own maintenance_requests" ON maintenance_requests
    FOR UPDATE USING (
        auth.uid() = requester_id
    );

-- Step 5: Create User policies for facilities (read-only)
CREATE POLICY "Users can view active facilities" ON facilities
    FOR SELECT USING (
        is_active = true
    );

-- ==========================================
-- This creates:
-- 1. Simple Admin bypass using EXISTS subquery
-- 2. FOR ALL = SELECT, INSERT, UPDATE, DELETE for Admins
-- 3. User access to their own requests and read-only facilities
-- 4. Much simpler logic that should work reliably
-- ==========================================
