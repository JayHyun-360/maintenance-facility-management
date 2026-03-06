-- Fix RLS to allow authenticated users to read all profiles for admin notification lookup

-- Drop existing restrictive policies that might block reading all profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

-- Allow all authenticated users to read all profiles (needed for admin lookup)
CREATE POLICY "profiles_select_all_authenticated" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);
