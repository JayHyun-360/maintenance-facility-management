-- Fix RLS Policies to Use Circuit Breaker Pattern
-- This fixes the "Failed to fetch" errors by using auth.jwt() instead of querying auth.users

-- Step 1: Fix Maintenance Requests RLS Policies  
DROP POLICY IF EXISTS "Users can view their own requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can insert their own requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON maintenance_requests;

-- Create new RLS policies for maintenance_requests using circuit breaker pattern
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

-- Step 2: Fix Profiles RLS Policies (if they exist)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Create new RLS policies for profiles using circuit breaker pattern
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage all profiles" ON profiles
    FOR ALL USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

-- Step 3: Verify the policies are correctly applied
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('maintenance_requests', 'profiles')
ORDER BY tablename, policyname;
