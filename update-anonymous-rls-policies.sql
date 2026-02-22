-- Updated RLS Policies for Anonymous Users (signInAnonymously)
-- Anonymous users have is_anonymous: true in JWT and use authenticated role

-- Update maintenance_requests policies
DROP POLICY IF EXISTS "Users can view their own requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can create requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Admins can do everything" ON maintenance_requests;

-- Recreate policies with proper anonymous user handling
CREATE POLICY "Users can view their own requests" ON maintenance_requests
    FOR SELECT USING (
        -- Admins can see all requests
        (auth.jwt() ->> 'role') = 'Admin' OR
        -- Authenticated users (including anonymous) can see their own requests
        auth.uid() = requester_id
    );

CREATE POLICY "Users can create requests" ON maintenance_requests
    FOR INSERT WITH CHECK (
        -- Admins can create requests for anyone
        (auth.jwt() ->> 'role') = 'Admin' OR
        -- Users (including anonymous) can create for themselves
        auth.uid() = requester_id
    );

CREATE POLICY "Admins can do everything" ON maintenance_requests
    FOR ALL USING (
        (auth.jwt() ->> 'role') = 'Admin'
    );

-- Update profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Recreate profiles policies with proper anonymous user handling
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (
        -- Admins can see all profiles
        (auth.jwt() ->> 'role') = 'Admin' OR
        -- Users (including anonymous) can see their own profile
        auth.uid() = id
    );

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (
        -- Admins can update any profile
        (auth.jwt() ->> 'role') = 'Admin' OR
        -- Users (including anonymous) can update their own profile
        auth.uid() = id
    );

CREATE POLICY "Admins can manage all profiles" ON profiles
    FOR ALL USING (
        (auth.jwt() ->> 'role') = 'Admin'
    );

-- Optional: Add policy to distinguish anonymous users for special handling
-- This can be useful for analytics or different UI behavior
CREATE POLICY "Anonymous users have limited access" ON maintenance_requests
    FOR SELECT USING (
        -- Allow anonymous users to see their own requests
        (auth.jwt() ->> 'is_anonymous')::boolean = true AND auth.uid() = requester_id
    );

-- Note: The is_anonymous claim can be used for:
-- 1. Different UI behavior for anonymous users
-- 2. Analytics to track anonymous vs authenticated usage
-- 3. Different data validation rules
-- 4. Special handling in application logic
