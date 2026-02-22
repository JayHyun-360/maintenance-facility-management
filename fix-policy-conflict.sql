-- Fix Policy Already Exists Error
-- Drop existing policy and recreate with proper name

-- Drop the conflicting policy
DROP POLICY IF EXISTS "Anonymous users have limited access" ON maintenance_requests;

-- Recreate with a different name to avoid conflicts
CREATE POLICY "Anonymous users can access own data" ON maintenance_requests
    FOR SELECT USING (
        -- Allow anonymous users to see their own requests
        (auth.jwt() ->> 'is_anonymous')::boolean = true AND auth.uid() = requester_id
    );

-- Verify all policies are correctly set
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
