-- Check Table Existence - Run this in Supabase SQL Editor
-- This will show us what tables actually exist

-- Step 1: List all tables in public schema
SELECT 
    'all_tables'::TEXT as step,
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Step 2: Check if maintenance_requests exists and its structure
SELECT 
    'maintenance_requests_structure'::TEXT as step,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'maintenance_requests'
ORDER BY ordinal_position;

-- Step 3: Check if there's a similar table to facilities
SELECT 
    'similar_tables'::TEXT as step,
    tablename
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename LIKE '%facility%'
OR tablename LIKE '%building%'
OR tablename LIKE '%location%';

-- ==========================================
-- This will help identify:
-- 1. What tables actually exist in the database
-- 2. The structure of maintenance_requests table
-- 3. If there's a facilities table with a different name
-- ==========================================
