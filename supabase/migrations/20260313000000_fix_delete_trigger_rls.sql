-- Fix delete trigger to work with RLS
-- The trigger function needs to bypass RLS when inserting audit logs

-- Grant execute on the trigger function to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.log_request_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_request_deletion() TO service_role;

-- Drop existing restrictive policies and create permissive ones for audit_logs
-- This allows the deletion trigger to insert audit logs
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can create audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Trigger can insert audit logs" ON public.audit_logs;

-- Allow authenticated users to insert audit logs (for status changes)
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Also allow insert when actor_id is NULL (trigger execution)
CREATE POLICY "Allow NULL actor_id insert" ON public.audit_logs
  FOR INSERT WITH CHECK (actor_id IS NULL OR actor_id = auth.uid());

-- Also ensure the trigger function can properly get the actor_id
-- Update the function to handle NULL auth.uid() gracefully
CREATE OR REPLACE FUNCTION public.log_request_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  -- Try to get the current user id, but allow NULL for trigger execution
  v_actor_id := auth.uid();
  
  -- Insert the audit log - if actor_id is NULL, it will still work
  -- The actor_id column allows NULL
  INSERT INTO public.audit_logs (request_id, actor_id, action)
  VALUES (OLD.id, v_actor_id, 'Request deleted');

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.log_request_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_request_deletion() TO service_role;
