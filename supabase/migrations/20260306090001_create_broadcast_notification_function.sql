-- Function to create broadcast notifications for all users
-- This bypasses RLS and ensures announcements reach all users

CREATE OR REPLACE FUNCTION public.create_broadcast_notifications(
  p_title TEXT,
  p_message TEXT,
  p_link_url TEXT,
  p_target_role TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_user RECORD;
BEGIN
  v_count := 0;
  
  -- Loop through all users with the specified role
  FOR v_user IN 
    SELECT id FROM profiles WHERE database_role = 'user'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, link_url, target_role)
    VALUES (v_user.id, p_title, p_message, p_link_url, p_target_role);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
