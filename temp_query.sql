-- Query to check admins in database
SELECT id, full_name, database_role FROM profiles WHERE database_role = 'admin';
