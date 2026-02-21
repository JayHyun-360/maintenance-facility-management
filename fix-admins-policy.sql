-- Fix the "Admins can do everything" Policy
-- This policy violates circuit breaker pattern by querying auth.users directly

-- Step 1: Drop the problematic policy
DROP POLICY IF EXISTS "Admins can do everything" ON maintenance_requests;

-- Step 2: Recreate it using circuit breaker pattern (auth.jwt() instead of auth.users)
CREATE POLICY "Admins can do everything" ON maintenance_requests
    FOR ALL USING (
        (auth.jwt() ->> 'role') = 'Admin'
    );

-- Step 3: Verify the fix
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
AND policyname = 'Admins can do everything';
