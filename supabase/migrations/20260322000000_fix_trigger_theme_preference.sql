-- Fix theme_preference in the handle_new_user trigger
-- The trigger creates profiles but doesn't include theme_preference,
-- causing a CHECK constraint violation when profile-creation tries to insert

-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with theme_preference
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract metadata or use sensible defaults
  DECLARE
    v_full_name TEXT;
    v_database_role TEXT;
    v_visual_role TEXT;
    v_educational_level TEXT;
    v_department TEXT;
    v_is_anonymous BOOLEAN;
  BEGIN
    -- Safely extract from metadata with defaults
    v_full_name := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      'User'
    );
    
    v_database_role := COALESCE(
      NEW.raw_user_meta_data->>'database_role',
      'user'
    );
    
    v_visual_role := NEW.raw_user_meta_data->>'visual_role';
    v_educational_level := NEW.raw_user_meta_data->>'educational_level';
    v_department := NEW.raw_user_meta_data->>'department';
    v_is_anonymous := COALESCE(
      (NEW.raw_user_meta_data->>'is_anonymous')::boolean,
      false
    );

    -- Insert profile using id as primary key, including theme_preference
    INSERT INTO public.profiles (
      id,
      full_name,
      database_role,
      visual_role,
      educational_level,
      department,
      is_anonymous,
      theme_preference,
      created_at
    ) VALUES (
      NEW.id,
      v_full_name,
      v_database_role,
      v_visual_role,
      v_educational_level,
      v_department,
      v_is_anonymous,
      'system', -- Default theme preference
      NOW()
    );

    -- Set role in app_metadata for JWT access (critical for RLS)
    UPDATE auth.users
    SET raw_app_metadata = jsonb_set(
      COALESCE(raw_app_metadata, '{}'::jsonb),
      '{role}',
      to_jsonb(v_database_role)
    )
    WHERE id = NEW.id;

    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail trigger completely
    -- This allows the auth.users record to be created
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
