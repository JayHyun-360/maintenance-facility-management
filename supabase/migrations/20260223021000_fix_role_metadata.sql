-- ==========================================
-- Fix Role Metadata Handling
-- ==========================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ==========================================
-- UPDATED ROLE SYNC TRIGGER (Enhanced)
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile using metadata passed during sign-up/guest login
  INSERT INTO public.profiles (id, full_name, database_role, visual_role, educational_level, department, is_anonymous)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NEW.raw_user_meta_data->>'visual_role',
    NEW.raw_user_meta_data->>'educational_level',
    NEW.raw_user_meta_data->>'department',
    COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, false)
  );

  -- Ensure role is stamped in user metadata for Circuit Breaker pattern
  UPDATE auth.users 
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')::jsonb
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- ENSURE EXISTING USERS HAVE ROLE METADATA
-- ==========================================
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  COALESCE(
    raw_user_meta_data->>'role',
    (SELECT database_role FROM public.profiles WHERE id = auth.users.id LIMIT 1),
    'user'
  )::jsonb
)
WHERE raw_user_meta_data->>'role' IS NULL;

-- ==========================================
-- RLS POLICY UPDATES (Enhanced Security)
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create enhanced RLS policies using JWT metadata (Circuit Breaker)
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR
    (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR
    (auth.jwt() ->> 'role') = 'admin'
  );

-- Maintenance requests policies
DROP POLICY IF EXISTS "Users can view own requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users can create requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON public.maintenance_requests;

CREATE POLICY "Users can view own requests" ON public.maintenance_requests
  FOR SELECT USING (
    requester_id = auth.uid() OR
    (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "Users can create requests" ON public.maintenance_requests
  FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Admins can update all requests" ON public.maintenance_requests
  FOR UPDATE USING ((auth.jwt() ->> 'role') = 'admin');

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (
    user_id = auth.uid() OR
    (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "Users can manage own notifications" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- Audit logs policies (admin only)
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can create audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Admins can create audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
