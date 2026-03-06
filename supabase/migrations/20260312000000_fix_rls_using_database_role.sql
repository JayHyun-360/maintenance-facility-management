-- Fix RLS policies to use database_role from profiles table instead of JWT
-- This follows the Circuit Breaker pattern to prevent stale JWT issues

-- Drop existing policies that use JWT metadata
DROP POLICY IF EXISTS "Admins can update all requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Admins can delete all requests" ON public.maintenance_requests;

-- Create a helper function to check if user is admin using database_role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND database_role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Create new UPDATE policy using database_role
CREATE POLICY "Admins can update all requests" ON public.maintenance_requests
  FOR UPDATE USING (public.is_admin() = true);

-- Create new DELETE policy using database_role
CREATE POLICY "Admins can delete all requests" ON public.maintenance_requests
  FOR DELETE USING (public.is_admin() = true);

-- Also fix audit_logs policies if they have the same issue
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;

CREATE POLICY "Admins can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (public.is_admin() = true OR actor_id = auth.uid());

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.is_admin() = true OR actor_id = auth.uid());
