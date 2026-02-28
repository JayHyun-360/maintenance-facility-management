-- Fix the status notification trigger to set target_role = 'user'
-- This ensures status change notifications go to the user dashboard, not admin

CREATE OR REPLACE FUNCTION public.create_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_requester_id UUID;
  v_requester_name TEXT;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Only create notification if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get requester info
    SELECT requester_id INTO v_requester_id 
    FROM public.maintenance_requests 
    WHERE id = NEW.id;

    IF v_requester_id IS NOT NULL THEN
      SELECT full_name INTO v_requester_name 
      FROM public.profiles 
      WHERE id = v_requester_id;

      -- Set notification content based on new status
      CASE NEW.status
        WHEN 'In Progress' THEN
          v_title := 'Request Started';
          v_message := 'Your maintenance request (ID: ' || LEFT(NEW.id::TEXT, 8) || ') is now In Progress.';
        WHEN 'Completed' THEN
          v_title := 'Request Completed';
          v_message := 'Your maintenance request (ID: ' || LEFT(NEW.id::TEXT, 8) || ') has been completed.';
        WHEN 'Cancelled' THEN
          v_title := 'Request Cancelled';
          v_message := 'Your maintenance request (ID: ' || LEFT(NEW.id::TEXT, 8) || ') has been cancelled.';
        ELSE
          v_title := 'Request Updated';
          v_message := 'Your maintenance request (ID: ' || LEFT(NEW.id::TEXT, 8) || ') status changed to ' || NEW.status || '.';
      END CASE;

      -- Insert notification with target_role = 'user' for status updates
      INSERT INTO public.notifications (user_id, title, message, link_url, target_role)
      VALUES (v_requester_id, v_title, v_message, '/dashboard', 'user');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
