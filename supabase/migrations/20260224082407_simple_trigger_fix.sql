-- Simple trigger fix to prevent JSON coercion errors

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.profiles WHERE user_id = NEW.id;
  
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
  
  UPDATE auth.users 
  SET raw_app_metadata = jsonb_set(
    COALESCE(raw_app_metadata, '{}'::jsonb),
    '{role}',
    to_jsonb(COALESCE(NEW.raw_user_meta_data->>'database_role', 'user'))
  )
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();