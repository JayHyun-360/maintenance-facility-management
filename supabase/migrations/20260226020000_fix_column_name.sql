-- Fix: Recreate sync_role_to_metadata with correct column name
-- Drop trigger first (if exists) to release dependency
DROP TRIGGER IF EXISTS on_profile_role_changed ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_role_to_metadata();

CREATE OR REPLACE FUNCTION public.sync_role_to_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.database_role IS DISTINCT FROM NEW.database_role THEN
    IF NEW.database_role NOT IN ('admin', 'user') THEN
      RAISE EXCEPTION 'Invalid role value: %', NEW.database_role;
    END IF;

    -- Use raw_app_meta_data (not raw_app_metadata)
    UPDATE auth.users 
    SET raw_app_meta_data = jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(NEW.database_role)
    )
    WHERE id = NEW.id;

    IF NEW.database_role = 'admin' THEN
      NEW.visual_role := 'Staff';
      NEW.educational_level := NULL;
      NEW.department := NULL;
    END IF;

    IF NEW.database_role = 'user' THEN
      IF NEW.visual_role = 'Staff' THEN
        NEW.visual_role := 'Student';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.sync_role_to_metadata() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_role_to_metadata() TO service_role;

-- Recreate trigger
CREATE TRIGGER on_profile_role_changed
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_to_metadata();
