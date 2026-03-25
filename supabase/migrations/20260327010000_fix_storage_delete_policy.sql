-- Fix storage delete policy for avatars bucket
-- The current policy may not be matching correctly

-- Drop and recreate the delete policy with explicit check
DROP POLICY IF EXISTS "allow_authenticated_avatar_delete" ON storage.objects;

CREATE POLICY "allow_authenticated_avatar_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars')
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Also ensure the update policy is correct for consistency
DROP POLICY IF EXISTS "allow_authenticated_avatar_update" ON storage.objects;

CREATE POLICY "allow_authenticated_avatar_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars')
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
