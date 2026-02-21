-- Fix Analytics RLS Policy
-- Add specific policy for analytics that allows admins to see aggregated data

-- Add analytics-specific policy for maintenance_requests
CREATE POLICY "Admins can view analytics data" ON maintenance_requests
    FOR SELECT USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

-- Verify the policies are correctly applied
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
