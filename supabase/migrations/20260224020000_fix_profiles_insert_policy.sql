-- ==========================================
-- Fix Profiles INSERT Policy for Profile Creation
-- ==========================================

-- Add missing INSERT policy for profiles table
-- This allows authenticated users to create their own profile
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
  );

-- Also add UPSERT policy for profile creation page
CREATE POLICY "Users can upsert their own profile" ON public.profiles
  FOR ALL USING (
    auth.uid() = id
  ) WITH CHECK (
    auth.uid() = id
  );

-- Ensure all necessary policies exist
DO $$
BEGIN
    -- Check if the policy exists, if not create it
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can insert their own profile'
    ) THEN
        CREATE POLICY "Users can insert their own profile" ON public.profiles
          FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;

    -- Check if the upsert policy exists, if not create it
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can upsert their own profile'
    ) THEN
        CREATE POLICY "Users can upsert their own profile" ON public.profiles
          FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
    END IF;
END $$;
