-- Storage RLS policies for maintenance-requests-photos bucket

-- Allow authenticated users to upload photos
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'maintenance-requests-photos'
);

-- Allow authenticated users to view photos
CREATE POLICY "Allow authenticated view"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'maintenance-requests-photos'
);

-- Allow authenticated users to update photos
CREATE POLICY "Allow authenticated update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'maintenance-requests-photos'
);

-- Allow authenticated users to delete photos
CREATE POLICY "Allow authenticated delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'maintenance-requests-photos'
);

-- Allow anon users to view (for public access to photos)
CREATE POLICY "Allow anon view"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'maintenance-requests-photos'
);
