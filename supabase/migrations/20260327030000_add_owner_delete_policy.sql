-- Add Owner Delete policy for avatars bucket
-- This allows users to delete files they own

CREATE POLICY "Owner Delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
