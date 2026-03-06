-- Add DELETE policy for maintenance_requests
-- Allow admins to delete any request

DROP POLICY IF EXISTS "Admins can delete all requests" ON public.maintenance_requests;

CREATE POLICY "Admins can delete all requests" ON public.maintenance_requests
  FOR DELETE USING ((auth.jwt() ->> 'role') = 'admin');
