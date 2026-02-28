-- Function to allow users to create admin notifications when submitting maintenance requests
-- This bypasses RLS for the specific case of creating notifications for admins

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
