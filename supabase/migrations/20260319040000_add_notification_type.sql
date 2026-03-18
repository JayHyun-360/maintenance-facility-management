-- Add type column to notifications table to distinguish announcements from regular notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'notification' CHECK (type IN ('announcement', 'notification'));

-- Update existing notifications based on title pattern:
-- Status notifications should be 'notification'
-- Broadcasts/announcements should be 'announcement'
UPDATE notifications 
SET type = 'notification' 
WHERE (
  title LIKE 'Request Completed%'
  OR title LIKE 'Request Started%'
  OR title LIKE 'Request Cancelled%'
  OR title LIKE 'Request Updated%'
  OR title LIKE 'Request Status%'
  OR title LIKE 'New Message%'
  OR title LIKE 'Your maintenance request%'
);

-- Set remaining notifications that are NOT status-related to 'announcement'
UPDATE notifications 
SET type = 'announcement' 
WHERE type = 'notification'
AND title NOT LIKE 'Request Completed%'
AND title NOT LIKE 'Request Started%'
AND title NOT LIKE 'Request Cancelled%'
AND title NOT LIKE 'Request Updated%'
AND title NOT LIKE 'Request Status%'
AND title NOT LIKE 'New Message%'
AND title NOT LIKE 'Your maintenance request%';

-- Make the type column not null with a default
ALTER TABLE public.notifications ALTER COLUMN type SET DEFAULT 'notification';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
