-- Clean Slate: Complete Removal of Facilities System
-- This script removes the facilities table and all associated logic

-- Step 1: Drop RLS policies for facilities table
DROP POLICY IF EXISTS "Facilities are viewable by everyone" ON facilities;
DROP POLICY IF EXISTS "Only admins can manage facilities" ON facilities;

-- Step 2: Drop the facilities table and all dependencies
DROP TABLE IF EXISTS public.facilities CASCADE;

-- Step 3: Remove any facility-related functions or triggers
DROP FUNCTION IF EXISTS get_facility_stats() CASCADE;
DROP FUNCTION IF EXISTS update_facility_usage() CASCADE;

-- Step 4: Note: pg_policies is a system view and cannot be directly modified
-- The DROP TABLE and DROP POLICY statements above are sufficient

-- Step 5: Verify removal
SELECT 
    'facilities_table_exists' as check_name,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'facilities') as status;

-- Note: This query will return 0 if table doesn't exist, which is expected
SELECT 
    'facility_policies_exist' as check_name, 
    COUNT(*) as count
FROM pg_policies 
WHERE tablename = 'facilities';

-- Step 6: Update maintenance_requests to ensure location fields remain independent
-- (No changes needed as location_building and location_room are independent fields)

-- Clean Slate Complete: Facilities system completely removed
