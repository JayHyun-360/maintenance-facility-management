-- Fix audit_logs RLS to allow authenticated users to insert
-- This is needed because admins might be in "user" mode when updating status

DROP POLICY IF EXISTS "Admins can create audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON public.audit_logs;

CREATE POLICY "Authenticated users can create audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
