-- Comprehensive RLS Policy Audit and Fix
-- This will identify and fix any policies that reference 'users' table

-- Step 1: Check ALL current RLS policies
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

-- Step 2: Look for any policies that might reference 'users' table in their conditions
-- This will help us identify problematic policies

-- Step 3: Check if there are any policies on maintenance_requests that reference users
SELECT 
    policyname,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'maintenance_requests'
AND (qual ILIKE '%users%' OR with_check ILIKE '%users%');

-- Step 4: Also check profiles table policies for any users references
SELECT 
    policyname,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
AND (qual ILIKE '%users%' OR with_check ILIKE '%users%');
