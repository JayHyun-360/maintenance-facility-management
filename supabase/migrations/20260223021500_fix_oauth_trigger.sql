-- ==========================================
-- Fix Role Metadata Handling for Google OAuth
-- ==========================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ==========================================
-- UPDATED ROLE SYNC TRIGGER (OAuth Safe)
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with fallbacks for OAuth users
  INSERT INTO public.profiles (id, full_name, database_role, visual_role, educational_level, department, is_anonymous)
  VALUES (
    NEW.id,
    -- OAuth users: use email as fallback, guests: use name from metadata
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.email,
      'Unknown User'
    ),
    -- OAuth users: default to 'user', guests: use role from metadata
    COALESCE(
      NEW.raw_user_meta_data->>'role',
      NEW.raw_user_meta_data->>'database_role',
      'user'
    ),
    -- OAuth users: default to null, guests: use visual_role from metadata
    NEW.raw_user_meta_data->>'visual_role',
    -- OAuth users: default to null, guests: use educational_level from metadata
    NEW.raw_user_meta_data->>'educational_level',
    -- OAuth users: default to null, guests: use department from metadata
    NEW.raw_user_meta_data->>'department',
    -- OAuth users: false, guests: check is_anonymous flag
    COALESCE(
      (NEW.raw_user_meta_data->>'is_anonymous')::boolean,
      false
    )
  );

  -- Ensure role is stamped in user metadata for Circuit Breaker pattern
  -- Only update if role is not already set
  IF NEW.raw_user_meta_data->>'role' IS NULL THEN
    UPDATE auth.users 
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      COALESCE(
        NEW.raw_user_meta_data->>'database_role',
        'user'
      )::jsonb
    )
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION
  -- Handle profile insertion errors gracefully
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    -- This allows OAuth users to be created even if profile insertion fails
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
