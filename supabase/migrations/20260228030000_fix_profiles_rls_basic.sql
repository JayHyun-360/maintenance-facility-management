-- Fix RLS to ensure users can read their own profiles
-- This is critical for auth callback to work properly

-- Drop existing policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_view_all" ON public.profiles;

-- Allow users to read their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow authenticated users to read all profiles (for admin functionality)
CREATE POLICY "profiles_select_all_authenticated" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Ensure insert policy exists
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Ensure update policy exists  
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
