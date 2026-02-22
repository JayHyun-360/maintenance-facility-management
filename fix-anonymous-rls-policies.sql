-- Fix RLS Policies for Anonymous vs Authenticated Users
-- Add is_anonymous field checks to distinguish between guest and permanent users

-- Update maintenance_requests policies
DROP POLICY IF EXISTS "Users can view their own requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can create requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Admins can do everything" ON maintenance_requests;

-- Recreate policies with anonymous user checks
CREATE POLICY "Users can view their own requests" ON maintenance_requests
    FOR SELECT USING (
        -- Admins can see all requests
        (auth.jwt() ->> 'role') = 'Admin' OR
        -- Authenticated users can see their own requests
        (auth.uid() = requester_id AND (auth.jwt() ->> 'is_anonymous')::boolean = false) OR
        -- Anonymous users can see their own requests
        (auth.uid() = requester_id AND (auth.jwt() ->> 'is_anonymous')::boolean = true)
    );

CREATE POLICY "Users can create requests" ON maintenance_requests
    FOR INSERT WITH CHECK (
        -- Admins can create requests for anyone
        (auth.jwt() ->> 'role') = 'Admin' OR
        -- Authenticated users can create for themselves
        (auth.uid() = requester_id AND (auth.jwt() ->> 'is_anonymous')::boolean = false) OR
        -- Anonymous users can create for themselves
        (auth.uid() = requester_id AND (auth.jwt() ->> 'is_anonymous')::boolean = true)
    );

CREATE POLICY "Admins can do everything" ON maintenance_requests
    FOR ALL USING (
        (auth.jwt() ->> 'role') = 'Admin'
    );

-- Update profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Recreate profiles policies with anonymous checks
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (
        -- Admins can see all profiles
        (auth.jwt() ->> 'role') = 'Admin' OR
        -- Users can see their own profile
        (auth.uid() = id AND (auth.jwt() ->> 'is_anonymous')::boolean = false) OR
        -- Anonymous users can see their own profile
        (auth.uid() = id AND (auth.jwt() ->> 'is_anonymous')::boolean = true)
    );

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (
        -- Admins can update any profile
        (auth.jwt() ->> 'role') = 'Admin' OR
        -- Users can update their own profile
        (auth.uid() = id AND (auth.jwt() ->> 'is_anonymous')::boolean = false) OR
        -- Anonymous users can update their own profile
        (auth.uid() = id AND (auth.jwt() ->> 'is_anonymous')::boolean = true)
    );

CREATE POLICY "Admins can manage all profiles" ON profiles
    FOR ALL USING (
        (auth.jwt() ->> 'role') = 'Admin'
    );
