-- Definitive Fix: Remove ALL problematic policies and recreate correctly
-- This will eliminate the duplicate policy that still references auth.users

-- Step 1: Drop ALL policies that might be problematic
DROP POLICY IF EXISTS "Admins can do everything" ON maintenance_requests;
DROP POLICY IF EXISTS "Admins can do everything" ON maintenance_requests; -- Run twice to be sure

-- Step 2: Drop any other potentially problematic policies
DROP POLICY IF EXISTS "Admins can view all requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON maintenance_requests;

-- Step 3: Recreate all admin policies with correct circuit breaker pattern
CREATE POLICY "Admins can view all requests" ON maintenance_requests
    FOR SELECT USING (
        (auth.jwt() ->> 'role') = 'Admin'
    );

CREATE POLICY "Admins can update all requests" ON maintenance_requests
    FOR UPDATE USING (
        (auth.jwt() ->> 'role') = 'Admin'
    );

CREATE POLICY "Admins can do everything" ON maintenance_requests
    FOR ALL USING (
        (auth.jwt() ->> 'role') = 'Admin'
    );

-- Step 4: Verify all policies are correct
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
AND tablename = 'maintenance_requests'
ORDER BY policyname;
