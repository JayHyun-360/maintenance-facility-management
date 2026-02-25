-- ==========================================
-- Enhanced Role Sync Trigger
-- Purpose: Auto-sync JWT when database_role changes + auto-clear user fields when switching to admin
-- ==========================================

-- 1. Create the enhanced trigger function
CREATE OR REPLACE FUNCTION public.sync_role_to_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if database_role actually changed
  IF OLD.database_role IS DISTINCT FROM NEW.database_role THEN
    -- Validate role value (security check)
    IF NEW.database_role NOT IN ('admin', 'user') THEN
      RAISE EXCEPTION 'Invalid role value: %', NEW.database_role;
    END IF;

    -- Sync role to JWT app_metadata
    UPDATE auth.users 
    SET raw_app_meta_data = jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(NEW.database_role)
    )
    WHERE id = NEW.id;

    -- If switching TO admin, clear user-specific fields to match admin profile
    IF NEW.database_role = 'admin' THEN
      NEW.visual_role := 'Staff';
      NEW.educational_level := NULL;
      NEW.department := NULL;
      RAISE LOG 'Role switch to admin: cleared user fields for user %', NEW.id;
    END IF;

    -- If switching TO user, ensure visual_role is valid for user mode
    IF NEW.database_role = 'user' THEN
      IF NEW.visual_role = 'Staff' THEN
        NEW.visual_role := 'Student';
      END IF;
      RAISE LOG 'Role switch to user: set visual_role to % for user %', NEW.visual_role, NEW.id;
    END IF;

    RAISE LOG 'Role sync completed: user % now has role %', NEW.id, NEW.database_role;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS on_profile_role_changed ON public.profiles;

-- 3. Create the trigger on profile updates
CREATE TRIGGER on_profile_role_changed
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_to_metadata();

-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.sync_role_to_metadata() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_role_to_metadata() TO service_role;

-- 5. Verify the function works
DO $$
DECLARE
  func_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'sync_role_to_metadata'
  ) INTO func_exists;
  
  IF func_exists THEN
    RAISE LOG '✅ sync_role_to_metadata function created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create sync_role_to_metadata function';
  END IF;
END $$;
