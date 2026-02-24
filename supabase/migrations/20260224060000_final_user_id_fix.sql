-- ==========================================
-- Final Fix: Complete user_id Migration and Debug Function
-- ==========================================
-- This resolves all conflicts between id and user_id usage

-- 1. Ensure profiles table has correct structure
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update any existing records
UPDATE public.profiles 
SET user_id = id 
WHERE user_id IS NULL;

-- Make user_id NOT NULL
ALTER TABLE public.profiles 
ALTER COLUMN user_id SET NOT NULL;

-- 2. Fix the trigger to use user_id consistently
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the trigger execution
  RAISE LOG 'handle_new_user triggered for user % with email %', NEW.id, NEW.email;
  
  -- Insert profile using user_id field
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
      NEW.id,  -- user_id references auth.users.id
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Unknown User'),
      COALESCE(NEW.raw_user_meta_data->>'database_role', 'user'),
      NEW.raw_user_meta_data->>'visual_role',
      NEW.raw_user_meta_data->>'educational_level',
      NEW.raw_user_meta_data->>'department',
      COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, false)
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE LOG 'Profile inserted successfully for user %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error inserting profile for user %: %', NEW.id, SQLERRM;
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
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix debug function to use user_id
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
    EXISTS(SELECT 1 FROM public.profiles WHERE user_id = user_id) as profile_exists,
    (SELECT raw_app_metadata FROM auth.users WHERE id = user_id) as app_metadata,
    (SELECT raw_user_meta_data FROM auth.users WHERE id = user_id) as user_metadata,
    (SELECT to_jsonb(public.profiles) FROM public.profiles WHERE user_id = user_id) as profile_details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update RLS policies to use user_id consistently
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- 5. Update notifications policies to use user_id
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 6. Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Add proper indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.debug_user_creation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_user_creation(UUID) TO service_role;
