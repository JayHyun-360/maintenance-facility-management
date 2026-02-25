-- ==========================================
-- Consolidated Schema Fix: Resolve id vs user_id Conflict
-- ==========================================
-- This migration fixes the authentication error by:
-- 1. Cleaning up conflicting user_id column
-- 2. Resetting profiles table to use 'id' as FK to auth.users
-- 3. Creating a bulletproof trigger
-- 4. Fixing all RLS policies

-- ==========================================
-- Step 1: Remove conflicting user_id if it exists
-- ==========================================
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS user_id CASCADE;

-- ==========================================
-- Step 2: Ensure profiles table has correct structure
-- ==========================================
-- Profiles should reference auth.users via id (PRIMARY KEY)
-- Drop and recreate to ensure clean state
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  database_role TEXT DEFAULT 'user' CHECK (database_role IN ('admin', 'user')),
  visual_role TEXT CHECK (visual_role IN ('Teacher', 'Staff', 'Student')),
  educational_level TEXT,
  department TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Logic: If educational_level is 'College', department must not be null
  CONSTRAINT college_dept_check CHECK (
    (educational_level = 'College' AND department IS NOT NULL) OR 
    (educational_level <> 'College' OR educational_level IS NULL)
  )
);

-- ==========================================
-- Step 3: Recreate dependent tables
-- ==========================================
DROP TABLE IF EXISTS public.maintenance_requests CASCADE;

CREATE TABLE public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  nature TEXT NOT NULL,
  urgency TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  link_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

DROP TABLE IF EXISTS public.audit_logs CASCADE;

CREATE TABLE public.audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id UUID REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- Step 4: Create bulletproof trigger
-- ==========================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract metadata or use sensible defaults
  DECLARE
    v_full_name TEXT;
    v_database_role TEXT;
    v_visual_role TEXT;
    v_educational_level TEXT;
    v_department TEXT;
    v_is_anonymous BOOLEAN;
  BEGIN
    -- Safely extract from metadata with defaults
    v_full_name := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      'User'
    );
    
    v_database_role := COALESCE(
      NEW.raw_user_meta_data->>'database_role',
      'user'
    );
    
    v_visual_role := NEW.raw_user_meta_data->>'visual_role';
    v_educational_level := NEW.raw_user_meta_data->>'educational_level';
    v_department := NEW.raw_user_meta_data->>'department';
    v_is_anonymous := COALESCE(
      (NEW.raw_user_meta_data->>'is_anonymous')::boolean,
      false
    );

    -- Insert profile using id as primary key
    INSERT INTO public.profiles (
      id,
      full_name,
      database_role,
      visual_role,
      educational_level,
      department,
      is_anonymous,
      created_at
    ) VALUES (
      NEW.id,
      v_full_name,
      v_database_role,
      v_visual_role,
      v_educational_level,
      v_department,
      v_is_anonymous,
      NOW()
    );

    -- Set role in app_metadata for JWT access (critical for RLS)
    UPDATE auth.users
    SET raw_app_metadata = jsonb_set(
      COALESCE(raw_app_metadata, '{}'::jsonb),
      '{role}',
      to_jsonb(v_database_role)
    )
    WHERE id = NEW.id;

    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail trigger completely
    -- This allows the auth.users record to be created
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger with proper timing
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- Step 5: Create comprehensive RLS policies
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (
    (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Maintenance requests policies
CREATE POLICY "maintenance_requests_select_all" ON public.maintenance_requests
  FOR SELECT USING (true);

CREATE POLICY "maintenance_requests_insert" ON public.maintenance_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "maintenance_requests_update_own" ON public.maintenance_requests
  FOR UPDATE USING (requester_id = auth.uid());

CREATE POLICY "maintenance_requests_update_admin" ON public.maintenance_requests
  FOR UPDATE USING (
    (auth.jwt() ->> 'role') = 'admin'
  );

-- Notifications policies
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Audit logs policies
CREATE POLICY "audit_logs_select_own" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      WHERE mr.id = audit_logs.request_id
      AND mr.requester_id = auth.uid()
    )
  );

-- ==========================================
-- Step 6: Create debug function for troubleshooting
-- ==========================================
CREATE OR REPLACE FUNCTION public.debug_oauth_issue(p_user_id UUID)
RETURNS TABLE (
  user_exists BOOLEAN,
  user_email TEXT,
  profile_exists BOOLEAN,
  profile_data JSONB,
  trigger_should_work BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id)::BOOLEAN as user_exists,
    (SELECT email FROM auth.users WHERE id = p_user_id)::TEXT as user_email,
    EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id)::BOOLEAN as profile_exists,
    (SELECT to_jsonb(profiles) FROM public.profiles WHERE id = p_user_id)::JSONB as profile_data,
    (EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) AND 
     NOT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id))::BOOLEAN as trigger_should_work;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Step 7: Verify migration success
-- ==========================================
-- Check that tables exist with correct structure
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='user_id') THEN
    RAISE WARNING 'WARNING: user_id column still exists on profiles table - this should not happen';
  END IF;
  
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='id') THEN
    RAISE EXCEPTION 'CRITICAL: id column missing from profiles table';
  END IF;

  RAISE NOTICE 'Schema consolidation migration completed successfully';
END $$;
