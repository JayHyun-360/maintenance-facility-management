-- Fix Foreign Key Relationship Between maintenance_requests and profiles
-- This resolves the "Could not find a relationship" error

-- Step 1: Check if foreign key constraint exists
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'maintenance_requests';

-- Step 2: Drop the constraint if it exists (to avoid errors)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_maintenance_requests_requester_id' 
        AND table_name = 'maintenance_requests'
    ) THEN
        ALTER TABLE maintenance_requests DROP CONSTRAINT fk_maintenance_requests_requester_id;
    END IF;
END $$;

-- Step 3: Add the foreign key constraint
ALTER TABLE maintenance_requests 
ADD CONSTRAINT fk_maintenance_requests_requester_id 
FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 4: Verify the constraint was added
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'maintenance_requests';
