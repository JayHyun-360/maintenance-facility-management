-- Phase 7: Add completed_at timestamp for proper workflow tracking

-- Add completed_at column to maintenance_requests
ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create trigger to automatically set completed_at when status changes to 'Completed'
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Set completed_at when status changes to 'Completed'
    IF OLD.status != 'Completed' AND NEW.status = 'Completed' THEN
        NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;
    
    -- Clear completed_at when status changes away from 'Completed'
    IF OLD.status = 'Completed' AND NEW.status != 'Completed' THEN
        NEW.completed_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_completed_at ON maintenance_requests;

-- Create the trigger
CREATE TRIGGER trigger_set_completed_at
    BEFORE UPDATE ON maintenance_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_completed_at();

-- Create index for better performance on completed_at queries
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_completed_at ON maintenance_requests(completed_at);
