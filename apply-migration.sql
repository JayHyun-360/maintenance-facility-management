-- Apply the user_id column fix to profiles table
-- Run this in your Supabase SQL editor

-- Add user_id column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing profiles to set user_id = id
UPDATE public.profiles 
SET user_id = id 
WHERE user_id IS NULL;

-- Make user_id NOT NULL
ALTER TABLE public.profiles 
ALTER COLUMN user_id SET NOT NULL;

-- Update trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, database_role, is_anonymous)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Guest User'), 
    COALESCE(NEW.raw_user_meta_data->>'database_role', 'user'),
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Add index
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
