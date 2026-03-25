-- Ensure users can update their own profile including avatar_url
-- This fixes the issue where avatar deletion doesn't update the database

-- First, check if the update policy exists and recreate it if needed
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Also ensure the policy allows updating avatar_url specifically
-- Grant explicit permission for avatar operations
GRANT UPDATE (avatar_url) ON public.profiles TO authenticated;
