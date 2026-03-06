-- Clean up storage bucket from orphaned files
-- This removes files from users that no longer exist in the profiles table

-- Delete storage objects where the user folder doesn't correspond to an existing profile
DELETE FROM storage.objects 
WHERE bucket_id = 'maintenance-requests-photos'
AND (
  -- Extract user_id from path (format: user_id/filename)
  split_part(name, '/', 1) NOT IN (
    SELECT id::text FROM public.profiles WHERE id IS NOT NULL
  )
  OR
  -- Also clean up any malformed paths
  name NOT LIKE '%/%'
);

-- Optional: If you want to completely clear the bucket, uncomment this:
-- DELETE FROM storage.objects WHERE bucket_id = 'maintenance-requests-photos';

-- Log the cleanup for verification
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % storage objects from maintenance-requests-photos bucket', deleted_count;
END
$$;
