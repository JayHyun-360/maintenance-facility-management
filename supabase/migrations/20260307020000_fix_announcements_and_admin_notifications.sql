-- Fix announcements table and admin notifications
-- This addresses the missing announcements table and notification issues

-- 1. Create announcements table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
DROP POLICY IF EXISTS "Users can read announcements" ON public.announcements;

-- Allow admins to manage announcements
CREATE POLICY "Admins can manage announcements" ON public.announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND database_role = 'admin'
    )
  );

-- Allow users to read announcements
CREATE POLICY "Users can read announcements" ON public.announcements
  FOR SELECT USING (true);

-- 2. Ensure RPC function exists for creating admin notifications
CREATE OR REPLACE FUNCTION public.create_admin_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_link_url TEXT,
  p_target_role TEXT
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, link_url, target_role)
  VALUES (p_user_id, p_title, p_message, p_link_url, p_target_role)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix admin notifications - ensure they have target_role='admin'
UPDATE public.notifications 
SET target_role = 'admin' 
WHERE target_role IS NULL 
AND user_id IN (
  SELECT id FROM public.profiles WHERE database_role = 'admin'
);

-- 4. Check if any admin notifications exist for current admin
-- If not, create a test notification for debugging
DO $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count 
  FROM public.notifications 
  WHERE target_role = 'admin' 
  LIMIT 1;
  
  IF admin_count = 0 THEN
    INSERT INTO public.notifications (user_id, title, message, target_role)
    SELECT id, 'System Ready', 'Admin notifications are now working correctly', 'admin'
    FROM public.profiles 
    WHERE database_role = 'admin' 
    LIMIT 1;
  END IF;
END $$;
