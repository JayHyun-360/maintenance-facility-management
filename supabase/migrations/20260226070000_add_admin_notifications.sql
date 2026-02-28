-- Add admin notifications for new maintenance requests
-- This creates notifications for admins when users submit new requests

-- Update the log_request_creation function to also notify admins
CREATE OR REPLACE FUNCTION public.log_request_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_requester_name TEXT;
  v_admin_ids UUID[];
BEGIN
  v_actor_id := auth.uid();

  IF v_actor_id IS NOT NULL THEN
    -- Insert into audit logs
    INSERT INTO public.audit_logs (request_id, actor_id, action)
    VALUES (NEW.id, v_actor_id, 'Request created');

    -- Get requester name
    SELECT full_name INTO v_requester_name 
    FROM public.profiles 
    WHERE id = v_actor_id;

    -- Get all admin user IDs
    SELECT array_agg(id) INTO v_admin_ids
    FROM public.profiles
    WHERE database_role = 'admin';

    -- Create notifications for all admins
    IF v_admin_ids IS NOT NULL AND array_length(v_admin_ids, 1) > 0 THEN
      FOR i IN 1..array_length(v_admin_ids, 1) LOOP
        INSERT INTO public.notifications (user_id, title, message, link_url)
        VALUES (
          v_admin_ids[i],
          CASE 
            WHEN NEW.urgency = 'Emergency' THEN '🚨 EMERGENCY Maintenance Request'
            ELSE 'New Maintenance Request'
          END,
          CASE 
            WHEN NEW.urgency = 'Emergency' THEN '🚨 EMERGENCY: ' || COALESCE(v_requester_name, 'Unknown') || ' submitted an emergency request: ' || LEFT(NEW.nature::TEXT, 50) || '...'
            ELSE 'New request from ' || COALESCE(v_requester_name, 'Unknown') || ': ' || LEFT(NEW.nature::TEXT, 50) || '...'
          END,
          '/admin/dashboard'
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger
DROP TRIGGER IF EXISTS trigger_log_request_creation 
ON public.maintenance_requests;

CREATE TRIGGER trigger_log_request_creation
  AFTER INSERT ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_request_creation();
