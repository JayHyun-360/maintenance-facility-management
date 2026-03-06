-- Fix all RLS and storage issues for user dashboard
-- This addresses the 400 Bad Request errors

-- 1. Fix storage policies - use a simpler approach that works
DROP POLICY IF EXISTS "allow_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_view" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_read" ON storage.objects;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "allow_authenticated_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'maintenance-requests-photos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to view photos
CREATE POLICY "allow_authenticated_view" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'maintenance-requests-photos'
  );

-- Allow authenticated users to update their own photos
CREATE POLICY "allow_authenticated_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'maintenance-requests-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own photos
CREATE POLICY "allow_authenticated_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'maintenance-requests-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read access
CREATE POLICY "allow_public_read" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'maintenance-requests-photos');

-- 2. Fix maintenance_requests policies - ensure users can insert
DROP POLICY IF EXISTS "Users can view own requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users can create requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON public.maintenance_requests;

-- Allow users to view their own requests
CREATE POLICY "Users can view own requests" ON public.maintenance_requests
  FOR SELECT USING (requester_id = auth.uid());

-- Allow users to create requests
CREATE POLICY "Users can create requests" ON public.maintenance_requests
  FOR INSERT WITH CHECK (requester_id = auth.uid());

-- Allow admins to update all requests
CREATE POLICY "Admins can update all requests" ON public.maintenance_requests
  FOR UPDATE USING ((auth.jwt() ->> 'role') = 'admin');

-- 3. Fix notifications policies - ensure target_role filter works
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

-- Allow users to view their own notifications (with target_role filter handled by query)
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- Allow users to create their own notifications
CREATE POLICY "Users can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow users to update their own notifications
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Allow users to delete their own notifications
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

-- 4. Ensure RLS is enabled on all tables
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
