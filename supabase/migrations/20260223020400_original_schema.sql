-- ==========================================
-- Original Schema Implementation
-- Unified Identity + Role Circuit Breaker + Logic Guards
-- ==========================================

-- ==========================================
-- 1. EXTENDED USER PROFILES
-- ==========================================
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
  
  -- Logic: If educational_level is 'College', department must not be null [cite: 2026-02-20]
  CONSTRAINT college_dept_check CHECK (
    (educational_level = 'College' AND department IS NOT NULL) OR 
    (educational_level <> 'College' OR educational_level IS NULL)
  )
);

-- ==========================================
-- 2. MAINTENANCE REQUESTS (Form Logic)
-- ==========================================
CREATE TABLE public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  nature TEXT NOT NULL, -- Plumbing, Carpentry, Electrical, etc.
  urgency TEXT NOT NULL, -- Emergency, Urgent, Not Urgent
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 3. NOTIFICATIONS & THEME SUPPORT
-- ==========================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  link_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 4. AUDIT LOGS (Simple Transactions)
-- ==========================================
CREATE TABLE public.audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id UUID REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL, -- e.g., 'Status changed to In Progress'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 5. THE ROLE SYNC TRIGGER (The "Circuit Breaker")
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile using metadata passed during sign-up/guest login [cite: 2026-02-20]
  INSERT INTO public.profiles (id, full_name, database_role, is_anonymous)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Guest User'), 
    COALESCE(NEW.raw_user_meta_data->>'database_role', 'user'),
    COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, false)
  );

  -- Stamp role into app_metadata so RLS and Middleware work instantly [cite: 2026-02-20]
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Maintenance Requests RLS
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all requests" ON public.maintenance_requests
  FOR SELECT USING (true);

CREATE POLICY "Users can create requests" ON public.maintenance_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own requests" ON public.maintenance_requests
  FOR UPDATE USING (requester_id = auth.uid());

CREATE POLICY "Admins can update any request" ON public.maintenance_requests
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Notifications RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Audit Logs RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs for requests they created" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests mr 
      WHERE mr.id = request_id AND mr.requester_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Admins can create audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );
