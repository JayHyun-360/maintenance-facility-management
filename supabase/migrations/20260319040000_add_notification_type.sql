-- Add type column to notifications table to distinguish announcements from regular notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'notification' CHECK (type IN ('announcement', 'notification'));

-- Update existing notifications based on title pattern:
-- Status notifications (Request Completed, Request Started, etc.) should be 'notification'
-- Broadcasts/announcements should be 'announcement'
UPDATE notifications 
SET type = 'notification' 
WHERE type IS NULL 
AND (
  title LIKE 'Request Completed%'
  OR title LIKE 'Request Started%'
  OR title LIKE 'Request Cancelled%'
  OR title LIKE 'Request Updated%'
  OR title LIKE 'New Message%'
);

-- Set remaining null types to 'announcement' (for backward compatibility with old broadcasts)
UPDATE notifications SET type = 'announcement' WHERE type IS NULL;

-- Make the type column not null with a default
ALTER TABLE public.notifications ALTER COLUMN type SET DEFAULT 'notification';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
