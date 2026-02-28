-- Fix admin message notification trigger to set target_role = 'user'
-- This ensures admin messages to users appear in user dashboard, not admin dashboard

CREATE OR REPLACE FUNCTION public.handle_admin_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  -- Get admin name for the notification
  SELECT full_name INTO v_user_name
  FROM public.profiles
  WHERE id = auth.uid();

  -- Create a notification for the user with target_role = 'user'
  INSERT INTO public.notifications (user_id, title, message, link_url, target_role)
  VALUES (
    NEW.user_id,
    'New Message from Administrator',
    COALESCE(v_user_name, 'Administrator') || ': ' || LEFT(NEW.message, 100) || CASE WHEN LENGTH(NEW.message) > 100 THEN '...' ELSE '' END,
    '/dashboard',
    'user'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
