-- Function to get all admin profiles (bypasses RLS for admin lookup)
CREATE OR REPLACE FUNCTION public.get_admin_profiles()
RETURNS TABLE(id UUID, database_role TEXT, full_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.database_role, p.full_name
  FROM public.profiles p
  WHERE p.database_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
