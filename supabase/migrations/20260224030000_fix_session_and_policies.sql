-- ==========================================
-- Fix Session Handling and RLS Policies for Welcome Pages
-- ==========================================

-- Ensure proper RLS policies for profiles table
-- This fixes the issue where welcome pages can't detect user roles

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can upsert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can check their own profile existence" ON public.profiles;

-- Create comprehensive RLS policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can insert their own profile (needed for profile creation)
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Admins can update any profile
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Ensure trigger properly sets role metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with proper error handling
  INSERT INTO public.profiles (id, full_name, database_role, visual_role, educational_level, department, is_anonymous)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Unknown User'),
    COALESCE(NEW.raw_user_meta_data->>'database_role', 'user'),
    NEW.raw_user_meta_data->>'visual_role',
    NEW.raw_user_meta_data->>'educational_level',
    NEW.raw_user_meta_data->>'department',
    COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, false)
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Set role in app_metadata for JWT access (Circuit Breaker)
  UPDATE auth.users 
  SET raw_app_metadata = jsonb_set(
    COALESCE(raw_app_metadata, '{}'::jsonb),
    '{role}',
    COALESCE(NEW.raw_user_meta_data->>'database_role', '"user"')
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
