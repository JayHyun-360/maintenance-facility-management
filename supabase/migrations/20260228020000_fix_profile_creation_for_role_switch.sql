-- Fix profile creation for role switching scenarios
-- This migration ensures that:
-- 1. Admins can switch between admin/user modes without profile issues
-- 2. Profile creation page can handle existing profiles when switching roles

-- Create a function to handle profile upsert for role switching
CREATE OR REPLACE FUNCTION public.upsert_profile_for_role_switch(
  p_user_id UUID,
  p_full_name TEXT,
  p_database_role TEXT,
  p_visual_role TEXT,
  p_educational_level TEXT,
  p_department TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Check if profile exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    -- Update existing profile (allows role switching)
    UPDATE public.profiles
    SET 
      full_name = COALESCE(p_full_name, full_name),
      database_role = p_database_role,
      visual_role = p_visual_role,
      educational_level = CASE 
        WHEN p_database_role = 'admin' THEN NULL 
        ELSE COALESCE(p_educational_level, educational_level) 
      END,
      department = CASE 
        WHEN p_database_role = 'admin' THEN NULL 
        ELSE COALESCE(p_department, department) 
      END
    WHERE id = p_user_id;
  ELSE
    -- Insert new profile
    INSERT INTO public.profiles (
      id, 
      full_name, 
      database_role, 
      visual_role, 
      educational_level, 
      department,
      is_anonymous
    )
    VALUES (
      p_user_id,
      p_full_name,
      p_database_role,
      p_visual_role,
      CASE WHEN p_database_role = 'admin' THEN NULL ELSE p_educational_level END,
      CASE WHEN p_database_role = 'admin' THEN NULL ELSE p_department END,
      false
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
