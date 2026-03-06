-- Fix audit_logs RLS policy to use database_role instead of JWT metadata
-- This follows the "Circuit Breaker" pattern to prevent infinite recursion

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can create audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view audit logs for requests they created" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;

-- Create new policies using database_role check
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND database_role = 'admin'
    )
  );

CREATE POLICY "Admins can create audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND database_role = 'admin'
    )
  );

CREATE POLICY "Users can view audit logs for their requests" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      WHERE mr.id = audit_logs.request_id
      AND mr.requester_id = auth.uid()
    )
  );
