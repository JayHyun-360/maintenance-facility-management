-- ==========================================
-- Fix OAuth Profile Creation for New User Flow
-- ==========================================
-- 
-- This migration modifies the trigger to NOT automatically create profiles
-- for OAuth users, allowing the application to handle profile creation
-- through the new user flow (profile creation page).

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create updated trigger function that only handles anonymous users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profiles automatically for anonymous users
  -- OAuth users will be handled by the application flow
  IF COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, false) THEN
    -- Check if profile already exists to avoid duplicates
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
      BEGIN
        -- Insert profile for anonymous users
        INSERT INTO public.profiles (id, full_name, database_role, visual_role, educational_level, department, is_anonymous)
        VALUES (
          NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'full_name', 'Guest User'),
          COALESCE(NEW.raw_user_meta_data->>'database_role', 'user'),
          NEW.raw_user_meta_data->>'visual_role',
          NEW.raw_user_meta_data->>'educational_level',
          NEW.raw_user_meta_data->>'department',
          true
        );
        
        -- Log successful profile creation
        RAISE LOG 'Anonymous profile created successfully for user %', NEW.id;
        
      EXCEPTION
        WHEN OTHERS THEN
          -- Log the error but don't fail the user creation
          RAISE WARNING 'Failed to create anonymous profile for user %: %', NEW.id, SQLERRM;
      END;
    END IF;
  END IF;

  -- Ensure role is stamped in user metadata for all users
  IF NEW.raw_user_meta_data->>'role' IS NULL THEN
    UPDATE auth.users 
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      COALESCE(
        NEW.raw_user_meta_data->>'database_role',
        '"user"'
      )::jsonb
    )
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- Add RLS policy to allow users to check their own profile existence
-- ==========================================

-- This policy is needed for the auth callback to check if a profile exists
CREATE POLICY "Users can check their own profile existence" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- ==========================================
-- Add function to safely check if user needs profile completion
-- ==========================================

CREATE OR REPLACE FUNCTION public.user_needs_profile_completion(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user exists in auth.users but not in profiles
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE id = user_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
