-- Add function to delete announcements
-- This function allows admins to delete announcements by ID
CREATE OR REPLACE FUNCTION delete_announcement(p_announcement_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND database_role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can delete announcements';
  END IF;

  -- Delete the announcement
  DELETE FROM announcements
  WHERE id = p_announcement_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
