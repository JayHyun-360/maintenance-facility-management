-- Check Profiles Table Structure
-- This will help us understand the actual column names

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check if there are any profiles in the table
SELECT COUNT(*) as profile_count FROM profiles;

-- Check a sample profile to see the structure
SELECT * FROM profiles LIMIT 1;
