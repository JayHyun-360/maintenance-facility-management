-- ==========================================
-- Fix JSON Coercion Error: Improve Trigger and Query Handling
-- ==========================================
-- "Cannot coerce to result to a single JSON object" occurs when
-- query returns multiple rows or no rows when .single() is expected

-- 1. Fix trigger to handle conflicts properly and ensure single insertion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the trigger execution
  RAISE LOG 'handle_new_user triggered for user % with email %', NEW.id, NEW.email;
  
  -- Delete any existing profile for this user to prevent duplicates
  DELETE FROM public.profiles WHERE user_id = NEW.id;
  
  -- Insert profile with proper error handling
  BEGIN
    INSERT INTO public.profiles (
      user_id, 
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
    );
    
    RAISE LOG 'Profile inserted successfully for user %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error inserting profile for user %: %', NEW.id, SQLERRM;
    -- Re-raise the exception to ensure proper error handling
    RAISE EXCEPTION USING SQLSTATE = SQLSTATE, SQLERRM = SQLERRM;
  END;

  -- Set role in app_metadata for JWT access
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
    -- Re-raise the exception
    RAISE EXCEPTION USING SQLSTATE = SQLSTATE, SQLERRM = SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update debug function to be more precise
CREATE OR REPLACE FUNCTION public.debug_user_creation(user_id UUID)
RETURNS TABLE(
  user_exists BOOLEAN,
  profile_exists BOOLEAN,
  profile_count BIGINT,
  app_metadata JSONB,
  user_metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(SELECT 1 FROM auth.users WHERE id = user_id) as user_exists,
    EXISTS(SELECT 1 FROM public.profiles WHERE user_id = user_id) as profile_exists,
    (SELECT COUNT(*) FROM public.profiles WHERE user_id = user_id) as profile_count,
    (SELECT raw_app_metadata FROM auth.users WHERE id = user_id) as app_metadata,
    (SELECT raw_user_meta_data FROM auth.users WHERE id = user_id) as user_metadata;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Add function to manually clean up duplicate profiles if needed
CREATE OR REPLACE FUNCTION public.cleanup_duplicate_profiles(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Keep only the most recent profile for a user
  DELETE FROM public.profiles 
  WHERE user_id = user_id 
  AND id NOT IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
      FROM public.profiles 
      WHERE user_id = user_id
    ) t 
    WHERE rn = 1
  );
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.debug_user_creation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_user_creation(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_duplicate_profiles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_duplicate_profiles(UUID) TO service_role;

-- 6. Add unique constraint to prevent duplicates
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- 7. Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_created_at ON public.profiles(user_id, created_at DESC);
