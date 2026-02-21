-- Check Admin RLS Policies - Run this in Supabase SQL Editor
-- This will verify RLS policies for maintenance_requests and facilities tables

-- Step 1: Check current RLS policies on maintenance_requests
SELECT 
    'maintenance_requests_policies'::TEXT as step,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check,
    CASE 
        WHEN qual LIKE '%auth.jwt()%' THEN 'Uses JWT auth'
        ELSE 'May not use proper auth'
    END as auth_check
FROM pg_policies 
WHERE tablename = 'maintenance_requests'
ORDER BY policyname;

-- Step 2: Check current RLS policies on facilities
SELECT 
    'facilities_policies'::TEXT as step,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check,
    CASE 
        WHEN qual LIKE '%auth.jwt()%' THEN 'Uses JWT auth'
        ELSE 'May not use proper auth'
    END as auth_check
FROM pg_policies 
WHERE tablename = 'facilities'
ORDER BY policyname;

-- Step 3: Check if RLS is enabled on these tables
SELECT 
    'rls_status'::TEXT as step,
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    forcerlspolicy as force_rls
FROM pg_tables 
WHERE tablename IN ('maintenance_requests', 'facilities')
AND schemaname = 'public';

-- Step 4: Check if tables exist and have data
SELECT 
    'table_status'::TEXT as step,
    'maintenance_requests'::TEXT as table_name,
    COUNT(*) as record_count
FROM maintenance_requests
UNION ALL
SELECT 
    'table_status'::TEXT as step,
    'facilities'::TEXT as table_name,
    COUNT(*) as record_count
FROM facilities;

-- ==========================================
-- This will help identify:
-- 1. Current RLS policies on both tables
-- 2. Whether policies use proper JWT auth checking
-- 3. If RLS is enabled on the tables
-- 4. If tables exist and have any data
-- ==========================================
