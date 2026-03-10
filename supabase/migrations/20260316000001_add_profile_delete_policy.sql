-- Add DELETE policy for guest users to delete their own profile (needed for guest sign-out)
-- Only allows deletion of profiles where is_anonymous = true
CREATE POLICY "profiles_delete_own_anonymous" ON public.profiles
  FOR DELETE USING (auth.uid() = id AND is_anonymous = true);
