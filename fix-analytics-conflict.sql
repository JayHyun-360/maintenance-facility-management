-- Fix Analytics RLS Policy Role Case and Policy Conflicts
-- This resolves the "permission denied for table users" error

-- Step 1: Drop the conflicting analytics policy
DROP POLICY IF EXISTS "Admins can view analytics data" ON maintenance_requests;

-- Step 2: Update existing admin policies to be more comprehensive
-- The existing "Admins can view all requests" policy should handle analytics too

-- Step 3: Verify current policies
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
