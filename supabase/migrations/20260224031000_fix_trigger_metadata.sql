-- ==========================================
-- Fix Trigger and Metadata Handling for Session Detection
-- ==========================================

-- Update trigger to properly set app_metadata for JWT access
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
  
  -- Set role in app_metadata for JWT access (Circuit Breaker pattern)
  UPDATE auth.users 
  SET raw_app_metadata = jsonb_set(
    COALESCE(raw_app_metadata, '{}'::jsonb),
    '{role}',
    COALESCE(NEW.raw_user_meta_data->>'database_role', '"user"')
  )
  WHERE id = NEW.id AND raw_app_metadata->>'role' IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Note: Existing users may need manual role updates in auth.users table
-- This should be done carefully to avoid breaking existing sessions
