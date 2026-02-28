-- Add trigger to auto-create notifications when admin sends messages
-- This ensures users receive real-time notifications when admin sends them messages

-- Create function to handle admin message insertion and notification creation
CREATE OR REPLACE FUNCTION public.handle_admin_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  -- Get admin name for the notification
  SELECT full_name INTO v_user_name
  FROM public.profiles
  WHERE id = auth.uid();

  -- Create a notification for the user
  INSERT INTO public.notifications (user_id, title, message, link_url)
  VALUES (
    NEW.user_id,
    'New Message from Administrator',
    COALESCE(v_user_name, 'Administrator') || ': ' || LEFT(NEW.message, 100) || CASE WHEN LENGTH(NEW.message) > 100 THEN '...' ELSE '' END,
    '/dashboard'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for admin_messages
DROP TRIGGER IF EXISTS trigger_admin_message_notification ON public.admin_messages;

CREATE TRIGGER trigger_admin_message_notification
  AFTER INSERT ON public.admin_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_message_notification();

-- Add is_broadcast column to admin_messages to identify broadcast messages
ALTER TABLE admin_messages ADD COLUMN IF NOT EXISTS is_broadcast BOOLEAN DEFAULT false;
