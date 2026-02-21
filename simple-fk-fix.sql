-- Simple Foreign Key Fix - Run each statement separately

-- Statement 1: Check current constraints
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type
FROM information_schema.table_constraints AS tc 
WHERE tc.table_name = 'maintenance_requests' 
AND tc.constraint_type = 'FOREIGN KEY';

-- Statement 2: Add foreign key constraint (will fail if already exists, that's ok)
ALTER TABLE maintenance_requests 
ADD CONSTRAINT fk_maintenance_requests_requester_id 
FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Statement 3: Verify the constraint was added
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
