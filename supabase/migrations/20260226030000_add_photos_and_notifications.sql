-- ==========================================
-- Add Photos Column and Notification RLS Fix
-- ==========================================

-- Add photos column to maintenance_requests (JSON array of image URLs)
ALTER TABLE public.maintenance_requests 
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_requester_id 
ON public.maintenance_requests(requester_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status 
ON public.maintenance_requests(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read 
ON public.notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id 
ON public.audit_logs(request_id);

-- Allow users to insert notifications for themselves (admin will create on their behalf)
CREATE POLICY "notifications_insert_admin" ON public.notifications
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin' OR user_id = auth.uid()
  );

-- Allow admins to view all notifications
CREATE POLICY "notifications_select_admin" ON public.notifications
  FOR SELECT USING (
    (auth.jwt() ->> 'role') = 'admin' OR user_id = auth.uid()
  );

-- Allow admins to update any notification
CREATE POLICY "notifications_update_admin" ON public.notifications
  FOR UPDATE USING (
    (auth.jwt() ->> 'role') = 'admin' OR user_id = auth.uid()
  );

-- Allow admins to delete any notification
CREATE POLICY "notifications_delete_admin" ON public.notifications
  FOR DELETE USING (
    (auth.jwt() ->> 'role') = 'admin' OR user_id = auth.uid()
  );

-- Function to create notification when status changes
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

      -- Insert notification
      INSERT INTO public.notifications (user_id, title, message, link_url)
      VALUES (v_requester_id, v_title, v_message, '/dashboard');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-notification on status change
DROP TRIGGER IF EXISTS trigger_create_status_notification 
ON public.maintenance_requests;

CREATE TRIGGER trigger_create_status_notification
  AFTER UPDATE ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_status_notification();

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION public.create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  -- Get the current user ID
  v_actor_id := auth.uid();

  -- Only create audit log if there's an actor
  IF v_actor_id IS NOT NULL THEN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.audit_logs (request_id, actor_id, action)
      VALUES (NEW.id, v_actor_id, 'Status changed from ' || COALESCE(OLD.status, 'None') || ' to ' || NEW.status);
    END IF;

    -- Log other field changes
    IF OLD.nature IS DISTINCT FROM NEW.nature THEN
      INSERT INTO public.audit_logs (request_id, actor_id, action)
      VALUES (NEW.id, v_actor_id, 'Nature changed from ' || COALESCE(OLD.nature, 'None') || ' to ' || NEW.nature);
    END IF;

    IF OLD.urgency IS DISTINCT FROM NEW.urgency THEN
      INSERT INTO public.audit_logs (request_id, actor_id, action)
      VALUES (NEW.id, v_actor_id, 'Urgency changed from ' || COALESCE(OLD.urgency, 'None') || ' to ' || NEW.urgency);
    END IF;

    IF OLD.location IS DISTINCT FROM NEW.location THEN
      INSERT INTO public.audit_logs (request_id, actor_id, action)
      VALUES (NEW.id, v_actor_id, 'Location changed from ' || COALESCE(OLD.location, 'None') || ' to ' || NEW.location);
    END IF;

    IF OLD.description IS DISTINCT FROM NEW.description THEN
      INSERT INTO public.audit_logs (request_id, actor_id, action)
      VALUES (NEW.id, v_actor_id, 'Description updated');
    END IF;

    IF OLD.photos IS DISTINCT FROM NEW.photos THEN
      INSERT INTO public.audit_logs (request_id, actor_id, action)
      VALUES (NEW.id, v_actor_id, 'Photos updated');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS trigger_create_audit_log 
ON public.maintenance_requests;

CREATE TRIGGER trigger_create_audit_log
  AFTER UPDATE ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_audit_log();

-- Log request creation
CREATE OR REPLACE FUNCTION public.log_request_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  v_actor_id := auth.uid();

  IF v_actor_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (request_id, actor_id, action)
    VALUES (NEW.id, v_actor_id, 'Request created');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_request_creation 
ON public.maintenance_requests;

CREATE TRIGGER trigger_log_request_creation
  AFTER INSERT ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_request_creation();

-- Log request deletion
CREATE OR REPLACE FUNCTION public.log_request_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  v_actor_id := auth.uid();

  IF v_actor_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (request_id, actor_id, action)
    VALUES (OLD.id, v_actor_id, 'Request deleted');
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_request_deletion 
ON public.maintenance_requests;

CREATE TRIGGER trigger_log_request_deletion
  AFTER DELETE ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_request_deletion();
