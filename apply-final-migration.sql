-- ==========================================
-- FINAL FIX: Apply user_id Schema Changes
-- ==========================================
-- Run this in Supabase SQL Editor to fix all user_id issues

-- Step 1: Add user_id column if missing
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Update existing data
UPDATE public.profiles 
SET user_id = id 
WHERE user_id IS NULL;

-- Step 3: Make user_id NOT NULL
ALTER TABLE public.profiles 
ALTER COLUMN user_id SET NOT NULL;

-- Step 4: Fix trigger to use user_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
  )
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE auth.users 
  SET raw_app_metadata = jsonb_set(
    COALESCE(raw_app_metadata, '{}'::jsonb),
    '{role}',
    to_jsonb(COALESCE(NEW.raw_user_meta_data->>'database_role', 'user'))
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Fix debug function
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

-- Step 6: Update RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Step 7: Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 8: Add indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Step 9: Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_user_creation(UUID) TO authenticated;

-- Step 10: Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
