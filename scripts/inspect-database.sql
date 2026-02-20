-- Database Schema Inspection Script
-- This script will examine all SQL that has been run in the database

-- 1. Check all tables in the database
SELECT 
    table_schema,
    table_name,
    table_type,
    CASE 
        WHEN table_name LIKE '%migration%' OR table_name LIKE '%schema%' THEN 'Migration Related'
        WHEN table_name = 'supabase_migrations' THEN 'Supabase Migration Tracker'
        ELSE 'Application Table'
    END as table_category
FROM information_schema.tables 
WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY table_schema, table_name;

-- 2. Check for migration tracking tables
SELECT 
    table_schema,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name LIKE '%migration%' OR table_name LIKE '%schema%' OR table_name LIKE '%version%'
ORDER BY table_schema, table_name, ordinal_position;

-- 3. Get all table definitions
SELECT 
    t.table_schema,
    t.table_name,
    c.column_name,
    c.ordinal_position,
    c.data_type,
    c.character_maximum_length,
    c.is_nullable,
    c.column_default,
    CASE 
        WHEN pk.column_name IS NOT NULL THEN 'PRIMARY KEY'
        WHEN fk.column_name IS NOT NULL THEN 'FOREIGN KEY'
        ELSE ''
    END as key_type
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
LEFT JOIN (
    SELECT ku.table_schema, ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
) pk ON c.table_schema = pk.table_schema AND c.table_name = pk.table_name AND c.column_name = pk.column_name
LEFT JOIN (
    SELECT ku.table_schema, ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
) fk ON c.table_schema = fk.table_schema AND c.table_name = fk.table_name AND c.column_name = fk.column_name
WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_schema, t.table_name, c.ordinal_position;

-- 4. Check all functions and stored procedures
SELECT 
    routine_schema,
    routine_name,
    routine_type,
    external_language,
    security_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema NOT IN ('information_schema', 'pg_catalog')
ORDER BY routine_schema, routine_name;

-- 5. Check all triggers
SELECT 
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_condition,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema NOT IN ('information_schema', 'pg_catalog')
ORDER BY trigger_schema, event_object_table, trigger_name;

-- 6. Check RLS policies
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
ORDER BY schemaname, tablename, policyname;

-- 7. Check constraints
SELECT 
    tc.constraint_schema,
    tc.constraint_name,
    tc.table_name,
    tc.constraint_type,
    kcu.column_name,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_schema NOT IN ('information_schema', 'pg_catalog')
ORDER BY tc.constraint_schema, tc.table_name, tc.constraint_name;

-- 8. Check indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY schemaname, tablename, indexname;
