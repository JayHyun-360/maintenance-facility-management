-- Final Admin RLS Fix - Run this in Supabase SQL Editor
-- This drops all existing policies and creates clean new ones

-- Step 1: Drop ALL existing policies on maintenance_requests
DROP POLICY IF EXISTS "Admins can view all maintenance_requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Admins can create maintenance_requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Admins can update all maintenance_requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Admins can delete all maintenance_requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can view their own maintenance_requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can create maintenance_requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can update their own maintenance_requests" ON maintenance_requests;

-- Step 2: Drop ALL existing policies on facilities
DROP POLICY IF EXISTS "Admins can view all facilities" ON facilities;
DROP POLICY IF EXISTS "Admins can create facilities" ON facilities;
DROP POLICY IF EXISTS "Admins can update all facilities" ON facilities;
DROP POLICY IF EXISTS "Admins can delete all facilities" ON facilities;
DROP POLICY IF EXISTS "Users can view active facilities" ON facilities;

-- Step 3: Create simple Admin bypass policies for maintenance_requests
CREATE POLICY "Admins can do everything maintenance_requests" ON maintenance_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'database_role' = 'Admin'
        )
    );

-- Step 4: Create simple Admin bypass policies for facilities
CREATE POLICY "Admins can do everything facilities" ON facilities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'database_role' = 'Admin'
        )
    );

-- Step 5: Create User policies for maintenance_requests
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

-- Step 6: Create User policies for facilities (read-only)
CREATE POLICY "Users can view active facilities" ON facilities
    FOR SELECT USING (
        is_active = true
    );

-- Step 7: Verify policies were created
SELECT 
    'policy_verification'::TEXT as step,
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename IN ('maintenance_requests', 'facilities')
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- ==========================================
-- This creates:
-- 1. Clean slate by dropping all existing policies
-- 2. Simple Admin bypass using EXISTS subquery
-- 3. FOR ALL = SELECT, INSERT, UPDATE, DELETE for Admins
-- 4. User access to their own requests and read-only facilities
-- 5. Verification of created policies
-- ==========================================
