-- Add policy to allow authenticated users to read all profiles
-- This is needed for the user dashboard to find admins when creating notifications

CREATE POLICY "profiles_read_all_authenticated" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);
