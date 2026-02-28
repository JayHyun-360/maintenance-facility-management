-- Fix RLS policy for profiles to allow admin to see all users
-- The issue is that the JWT role check might not work properly

-- Drop existing problematic policy
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;

-- Create a better admin policy that checks database_role directly
-- Using a function to avoid recursion issues
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND database_role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new admin select policy using the function
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (public.is_admin() = true);

-- Also allow admins to select all profiles for the manage users feature
-- This policy allows admins to see all user profiles
CREATE POLICY "profiles_admin_view_all" ON public.profiles
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE database_role = 'admin')
  );
