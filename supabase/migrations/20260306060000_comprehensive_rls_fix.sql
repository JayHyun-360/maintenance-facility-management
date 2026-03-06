-- Comprehensive RLS fix for all tables and storage
-- This addresses the 400 Bad Request errors

-- Ensure storage bucket exists
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('maintenance-requests-photos', 'maintenance-requests-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
  ON CONFLICT (id) DO NOTHING;
END
$$;

-- Clear and recreate storage policies
DROP POLICY IF EXISTS "allow_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_view" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_read" ON storage.objects;

-- Simple storage policies for authenticated users
CREATE POLICY "allow_authenticated_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'maintenance-requests-photos');

CREATE POLICY "allow_authenticated_view" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'maintenance-requests-photos');

CREATE POLICY "allow_authenticated_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'maintenance-requests-photos');

CREATE POLICY "allow_authenticated_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'maintenance-requests-photos');

CREATE POLICY "allow_public_read" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'maintenance-requests-photos');

-- Fix maintenance_requests policies (simplified)
DROP POLICY IF EXISTS "Users can view own requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users can create requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON public.maintenance_requests;

CREATE POLICY "Users can view own requests" ON public.maintenance_requests
  FOR SELECT USING (requester_id = auth.uid());

CREATE POLICY "Users can create requests" ON public.maintenance_requests
  FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Admins can update all requests" ON public.maintenance_requests
  FOR UPDATE USING ((auth.jwt() ->> 'role') = 'admin');

-- Fix notifications policies (simplified)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin' OR user_id = auth.uid()
  );

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());
