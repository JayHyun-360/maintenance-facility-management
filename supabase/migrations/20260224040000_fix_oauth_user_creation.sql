-- ==========================================
-- Fix OAuth User Creation and Metadata Handling
-- ==========================================

-- 1. Fix the trigger function to properly handle metadata and avoid JSON errors
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the trigger execution for debugging
  RAISE LOG 'handle_new_user triggered for user % with email %', NEW.id, NEW.email;
  
  -- Insert profile with better error handling and defaults
  BEGIN
    INSERT INTO public.profiles (
      id, 
      full_name, 
      database_role, 
      visual_role, 
      educational_level, 
      department, 
      is_anonymous
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Unknown User'),
      COALESCE(NEW.raw_user_meta_data->>'database_role', 'user'),
      NEW.raw_user_meta_data->>'visual_role',
      NEW.raw_user_meta_data->>'educational_level',
      NEW.raw_user_meta_data->>'department',
      COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, false)
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE LOG 'Profile inserted successfully for user %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error inserting profile for user %: %', NEW.id, SQLERRM;
    -- Don't fail the trigger, just log the error
  END;

  -- Set role in app_metadata for JWT access (Circuit Breaker pattern)
  -- Use to_jsonb() to ensure proper JSON formatting
  BEGIN
    UPDATE auth.users 
    SET raw_app_metadata = jsonb_set(
      COALESCE(raw_app_metadata, '{}'::jsonb),
      '{role}',
      to_jsonb(COALESCE(NEW.raw_user_meta_data->>'database_role', 'user'))
    )
    WHERE id = NEW.id;
    
    RAISE LOG 'App metadata updated for user %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error updating app metadata for user %: %', NEW.id, SQLERRM;
    -- Don't fail the trigger, just log the error
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Fix RLS policies to ensure proper access during OAuth flow
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can upsert their own profile" ON public.profiles;

-- Recreate policies with proper ordering and logic
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- 4. Ensure proper permissions for the trigger function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- 5. Add helpful debugging functions
CREATE OR REPLACE FUNCTION public.debug_user_creation(user_id UUID)
RETURNS TABLE(
  user_exists BOOLEAN,
  profile_exists BOOLEAN,
  app_metadata JSONB,
  user_metadata JSONB,
  profile_details JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(SELECT 1 FROM auth.users WHERE id = user_id) as user_exists,
    EXISTS(SELECT 1 FROM public.profiles WHERE id = user_id) as profile_exists,
    (SELECT raw_app_metadata FROM auth.users WHERE id = user_id) as app_metadata,
    (SELECT raw_user_meta_data FROM auth.users WHERE id = user_id) as user_metadata,
    (SELECT to_jsonb(public.profiles) FROM public.profiles WHERE id = user_id) as profile_details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Add function to manually fix existing users if needed
CREATE OR REPLACE FUNCTION public.fix_user_metadata(user_id UUID, new_role TEXT DEFAULT 'user')
RETURNS BOOLEAN AS $$
BEGIN
  -- Update app_metadata for existing user
  UPDATE auth.users 
  SET raw_app_metadata = jsonb_set(
    COALESCE(raw_app_metadata, '{}'::jsonb),
    '{role}',
    to_jsonb(new_role)
  )
  WHERE id = user_id;
  
  -- Ensure profile exists
  INSERT INTO public.profiles (id, full_name, database_role, is_anonymous)
  VALUES (
    user_id,
    COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = user_id), 'Unknown User'),
    new_role,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for debugging functions
GRANT EXECUTE ON FUNCTION public.debug_user_creation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_user_creation(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.fix_user_metadata(UUID, TEXT) TO service_role;
