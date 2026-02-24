-- ==========================================
-- Fix Profiles Table Schema: Add user_id column
-- ==========================================
-- The profiles table currently uses 'id' as primary key but 
-- trigger and callback expect 'user_id' field for auth.users reference

-- Add user_id column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing profiles to set user_id = id (for any existing data)
UPDATE public.profiles 
SET user_id = id 
WHERE user_id IS NULL;

-- Make user_id NOT NULL after updating existing data
ALTER TABLE public.profiles 
ALTER COLUMN user_id SET NOT NULL;

-- ==========================================
-- Update Trigger to use user_id instead of id
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile using metadata passed during sign-up/guest login
  INSERT INTO public.profiles (user_id, full_name, database_role, is_anonymous)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Guest User'), 
    COALESCE(NEW.raw_user_meta_data->>'database_role', 'user'),
    COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, false)
  );

  -- Stamp role into app_metadata so RLS and Middleware work instantly
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

-- ==========================================
-- Update RLS Policies to use user_id
-- ==========================================
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- Update Notifications table to use user_id consistently
-- ==========================================
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- Add index for better performance
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
