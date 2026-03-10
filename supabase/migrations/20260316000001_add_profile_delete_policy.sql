-- Add DELETE policy for users to delete their own profile (needed for guest sign-out)
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE USING (auth.uid() = id);
