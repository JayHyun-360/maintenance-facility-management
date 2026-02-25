-- Fix maintenance request submission issues
-- This migration adds proper RLS policies for authenticated users to insert requests

-- Drop existing problematic policies if any
DROP POLICY IF EXISTS "Users can create requests" ON public.maintenance_requests;

-- Create a more permissive policy for authenticated users
-- This allows any authenticated user to create maintenance requests
CREATE POLICY "allow_authenticated_insert" ON public.maintenance_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND requester_id = auth.uid()
  );

-- Also ensure the SELECT policy is properly set
DROP POLICY IF EXISTS "Users can view all requests" ON public.maintenance_requests;

CREATE POLICY "allow_authenticated_select" ON public.maintenance_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure users can update their own requests
DROP POLICY IF EXISTS "Users can update their own requests" ON public.maintenance_requests;

CREATE POLICY "allow_authenticated_update_own" ON public.maintenance_requests
  FOR UPDATE
  TO authenticated
  USING (requester_id = auth.uid());

-- Ensure admins can update any request
DROP POLICY IF EXISTS "Admins can update any request" ON public.maintenance_requests;

CREATE POLICY "allow_admin_update_any" ON public.maintenance_requests
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'admin'
  );

-- Fix storage bucket policies - ensure they work with proper bucket configuration
-- First, check if the bucket exists and is public
DO $$
BEGIN
  -- Try to make the bucket public if it exists
  UPDATE storage.buckets
  SET public = true
  WHERE id = 'maintenance-requests-photos';
EXCEPTION
  WHEN undefined_table THEN
    -- Bucket doesn't exist, create it
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('maintenance-requests-photos', 'maintenance-requests-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
END
$$;

-- Recreate storage policies with more explicit configuration
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated view" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon view" ON storage.objects;

-- Allow any authenticated user to upload
CREATE POLICY "allow_authenticated_upload" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'maintenance-requests-photos'
  );

-- Allow any authenticated user to view
CREATE POLICY "allow_authenticated_view" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'maintenance-requests-photos'
  );

-- Allow any authenticated user to update
CREATE POLICY "allow_authenticated_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'maintenance-requests-photos'
  );

-- Allow any authenticated user to delete
CREATE POLICY "allow_authenticated_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'maintenance-requests-photos'
  );

-- Allow public read access to photos
CREATE POLICY "allow_public_read" ON storage.objects
  FOR SELECT
  TO anon
  USING (
    bucket_id = 'maintenance-requests-photos'
  );
