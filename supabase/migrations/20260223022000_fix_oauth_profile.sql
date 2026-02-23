-- ==========================================
-- Fix OAuth User Profile Creation
-- ==========================================

-- First, let's create a profile for the existing OAuth user
INSERT INTO public.profiles (id, full_name, database_role, visual_role, educational_level, department, is_anonymous)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email, 'Unknown User'),
  'user', -- Default role for OAuth users
  NULL, -- OAuth users don't have visual_role initially
  NULL, -- OAuth users don't have educational_level initially  
  NULL, -- OAuth users don't have department initially
  false -- OAuth users are not anonymous
FROM auth.users 
WHERE email = 'jaydul1744@gmail.com'
AND id NOT IN (SELECT id FROM public.profiles);

-- Update the user's role metadata
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"user"'::jsonb
)
WHERE email = 'jaydul1744@gmail.com'
AND raw_user_meta_data->>'role' IS NULL;

-- Now, let's fix the trigger to be more robust
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a more robust trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if profile already exists to avoid duplicates
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    BEGIN
      -- Insert profile with proper error handling
      INSERT INTO public.profiles (id, full_name, database_role, visual_role, educational_level, department, is_anonymous)
      VALUES (
        NEW.id,
        COALESCE(
          NEW.raw_user_meta_data->>'full_name',
          NEW.raw_user_meta_data->>'name', 
          NEW.email,
          'Unknown User'
        ),
        COALESCE(
          NEW.raw_user_meta_data->>'role',
          NEW.raw_user_meta_data->>'database_role',
          'user'
        ),
        NEW.raw_user_meta_data->>'visual_role',
        NEW.raw_user_meta_data->>'educational_level',
        NEW.raw_user_meta_data->>'department',
        COALESCE(
          (NEW.raw_user_meta_data->>'is_anonymous')::boolean,
          false
        )
      );
      
      -- Log successful profile creation
      RAISE LOG 'Profile created successfully for user %', NEW.id;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        -- Try to create a minimal profile as fallback
        BEGIN
          INSERT INTO public.profiles (id, full_name, database_role, is_anonymous)
          VALUES (NEW.id, COALESCE(NEW.email, 'Unknown User'), 'user', false);
          RAISE LOG 'Minimal profile created as fallback for user %', NEW.id;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING 'Even minimal profile creation failed for user %: %', NEW.id, SQLERRM;
        END;
    END;
  END IF;

  -- Ensure role is stamped in user metadata
  IF NEW.raw_user_meta_data->>'role' IS NULL THEN
    UPDATE auth.users 
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      COALESCE(
        NEW.raw_user_meta_data->>'database_role',
        '"user"'
      )::jsonb
    )
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
