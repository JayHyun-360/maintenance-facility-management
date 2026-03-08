-- Fix admin_messages trigger to include target_role for notifications
-- This ensures notifications created from admin_messages have proper target_role

-- Update the trigger function to include target_role
CREATE OR REPLACE FUNCTION public.handle_admin_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  -- Get admin name for the notification
  SELECT full_name INTO v_user_name
  FROM public.profiles
  WHERE id = auth.uid();

  -- Create a notification for the user with target_role (full message)
  INSERT INTO public.notifications (user_id, title, message, link_url, target_role)
  VALUES (
    NEW.user_id,
    'New Message from Administrator',
    NEW.message,
    '/dashboard',
    'user'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_admin_message_notification ON public.admin_messages;

CREATE TRIGGER trigger_admin_message_notification
  AFTER INSERT ON public.admin_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_message_notification();
