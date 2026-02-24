-- ==========================================
-- Simple Trigger Fix: Prevent JSON Coercion Error
-- ==========================================

-- 1. Drop and recreate trigger with proper syntax
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Create improved trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete any existing profile for this user to prevent duplicates
  DELETE FROM public.profiles WHERE user_id = NEW.id;
  
  -- Insert profile
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
  
  -- Update app metadata
  UPDATE auth.users 
  SET raw_app_metadata = jsonb_set(
    COALESCE(raw_app_metadata, '{}'::jsonb),
    '{role}',
    to_jsonb(COALESCE(NEW.raw_user_meta_data->>'database_role', 'user'))
  )
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the trigger
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Ensure unique constraint exists
ALTER TABLE public.profiles 
ADD CONSTRAINT IF NOT EXISTS profiles_user_id_unique UNIQUE (user_id);
