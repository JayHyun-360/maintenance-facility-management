-- Database Inspection Script
-- Run this script to inspect your entire Supabase database structure

-- 1. List all tables
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Show table structures
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    c.character_maximum_length
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position;

-- 3. List all RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. List all triggers
SELECT 
    event_object_table,
    trigger_name,
    event_manipulation,
    action_timing,
    action_condition,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 5. List all functions
SELECT 
    routine_name,
    routine_type,
    data_type,
    external_language,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 6. Show indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 7. Show constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- 8. Current data in key tables
SELECT 'profiles' as table_name, COUNT(*) as row_count FROM profiles
UNION ALL
SELECT 'maintenance_requests' as table_name, COUNT(*) as row_count FROM maintenance_requests
UNION ALL
SELECT 'facilities' as table_name, COUNT(*) as row_count FROM facilities
UNION ALL
SELECT 'notifications' as table_name, COUNT(*) as row_count FROM notifications;

-- 9. Sample data from profiles
SELECT * FROM profiles LIMIT 5;

-- 10. Sample data from maintenance_requests  
SELECT * FROM maintenance_requests LIMIT 5;

-- 11. Check auth.users metadata
SELECT 
    id,
    email,
    created_at,
    raw_user_meta_data,
    app_metadata
FROM auth.users 
LIMIT 5;
