-- Create avatars storage bucket if not exists
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
  ON CONFLICT (id) DO NOTHING;
END
$$;

-- Storage policies for avatars bucket
DROP POLICY IF EXISTS "allow_authenticated_avatar_upload" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_avatar_view" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_avatar_update" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_avatar_delete" ON storage.objects;
DROP POLICY IF EXISTS "allow_anon_avatar_read" ON storage.objects;

CREATE POLICY "allow_authenticated_avatar_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "allow_authenticated_avatar_view" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "allow_authenticated_avatar_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "allow_authenticated_avatar_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "allow_anon_avatar_read" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'avatars');
