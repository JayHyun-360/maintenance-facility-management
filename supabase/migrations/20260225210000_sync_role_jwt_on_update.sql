-- ==========================================
-- Migration: Sync JWT Role On Profile Update
-- ==========================================
-- Problem: When database_role is changed directly in the database (or via 
-- the Profile Settings toggle), auth.users.raw_app_metadata.role (the JWT)
-- is NOT updated. The middleware reads JWT role, so the user gets sent to
-- the wrong dashboard.
--
-- Solution: A dedicated trigger function fires AFTER any UPDATE on
-- public.profiles where database_role actually changed, and immediately
-- re-stamps auth.users.raw_app_metadata.role with the new value.
--
-- This means:
--   1. Direct DB edit in Supabase dashboard  → JWT auto-synced ✅
--   2. Profile Settings toggle               → JWT auto-synced ✅
--   3. Any SQL command changing the role     → JWT auto-synced ✅
--
-- The user only needs a page reload (or refreshSession() call) for the
-- new JWT to be picked up by the browser session.
-- ==========================================

-- ==========================================
-- Step 1: Create the sync function
-- ==========================================
CREATE OR REPLACE FUNCTION public.sync_role_to_jwt()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when database_role actually changed (avoid unnecessary updates)
  IF OLD.database_role IS DISTINCT FROM NEW.database_role THEN
    RAISE LOG 'sync_role_to_jwt: Syncing role for user % from % to %',
      NEW.id, OLD.database_role, NEW.database_role;

    -- Stamp the new role into auth.users raw_app_metadata
    -- This is what Supabase uses to populate auth.jwt() ->> 'role'
    UPDATE auth.users
    SET raw_app_metadata = jsonb_set(
      COALESCE(raw_app_metadata, '{}'::jsonb),
      '{role}',
      to_jsonb(NEW.database_role)
    )
    WHERE id = NEW.id;

    RAISE LOG 'sync_role_to_jwt: Successfully synced role for user %', NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but do not fail the original profile UPDATE transaction
  RAISE WARNING 'sync_role_to_jwt: Failed to sync JWT role for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Step 2: Drop existing trigger if it exists (idempotent)
-- ==========================================
DROP TRIGGER IF EXISTS on_profile_role_changed ON public.profiles;

-- ==========================================
-- Step 3: Create the trigger on profiles UPDATE
-- ==========================================
CREATE TRIGGER on_profile_role_changed
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_to_jwt();

-- ==========================================
-- Step 4: Verify the trigger was created
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_profile_role_changed'
      AND event_object_table = 'profiles'
  ) THEN
    RAISE EXCEPTION 'CRITICAL: on_profile_role_changed trigger was not created successfully';
  END IF;

  RAISE NOTICE 'SUCCESS: on_profile_role_changed trigger created on public.profiles';
END $$;

-- ==========================================
-- Step 5: Backfill — Sync JWT for ALL existing users right now
-- ==========================================
-- This ensures any user whose database_role was manually changed before
-- this migration will also have their JWT corrected immediately.
DO $$
DECLARE
  rec RECORD;
  synced_count INT := 0;
BEGIN
  FOR rec IN
    SELECT p.id, p.database_role, u.raw_app_metadata
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE (u.raw_app_metadata ->> 'role') IS DISTINCT FROM p.database_role
  LOOP
    UPDATE auth.users
    SET raw_app_metadata = jsonb_set(
      COALESCE(raw_app_metadata, '{}'::jsonb),
      '{role}',
      to_jsonb(rec.database_role)
    )
    WHERE id = rec.id;

    synced_count := synced_count + 1;
    RAISE LOG 'Backfill: Synced role for user % → %', rec.id, rec.database_role;
  END LOOP;

  RAISE NOTICE 'Backfill complete: % user(s) had their JWT role re-synced', synced_count;
END $$;
