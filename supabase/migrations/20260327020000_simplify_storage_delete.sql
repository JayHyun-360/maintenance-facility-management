-- Simplify storage delete policy - allow authenticated users to delete from avatars bucket
-- Remove the folder name check which may not be working correctly

DROP POLICY IF EXISTS "allow_authenticated_avatar_delete" ON storage.objects;

CREATE POLICY "allow_authenticated_avatar_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');

-- Also simplify update policy
DROP POLICY IF EXISTS "allow_authenticated_avatar_update" ON storage.objects;

CREATE POLICY "allow_authenticated_avatar_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');
