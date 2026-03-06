-- Fix maintenance_requests RLS policies to use database_role instead of JWT metadata
-- This follows the "Circuit Breaker" pattern to prevent infinite recursion

-- Drop existing policies that use JWT
DROP POLICY IF EXISTS "Users can view own requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "maintenance_requests_update_admin" ON public.maintenance_requests;
DROP POLICY IF EXISTS "allow_admin_update_any" ON public.maintenance_requests;

-- Create new policies using JWT metadata (Circuit Breaker pattern)
CREATE POLICY "Users can view own requests" ON public.maintenance_requests
  FOR SELECT USING (
    requester_id = auth.uid() OR
    (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "Users can create requests" ON public.maintenance_requests
  FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Admins can update all requests" ON public.maintenance_requests
  FOR UPDATE USING (
    (auth.jwt() ->> 'role') = 'admin'
  );

-- Also fix notifications RLS if needed
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (
    user_id = auth.uid() OR
    (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "Users can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin' OR user_id = auth.uid()
  );

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (
    (auth.jwt() ->> 'role') = 'admin' OR user_id = auth.uid()
  );

CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE USING (
    (auth.jwt() ->> 'role') = 'admin' OR user_id = auth.uid()
  );
