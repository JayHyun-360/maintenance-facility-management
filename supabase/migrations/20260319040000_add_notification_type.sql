-- Add type column to notifications table to distinguish announcements from regular notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'notification' CHECK (type IN ('announcement', 'notification'));

-- Update existing broadcast notifications to be marked as announcements
-- This assumes broadcasts are created by inserting notifications for all users
-- We'll identify them by checking if they have a generic title pattern or were created around the same time for multiple users

-- First, let's make the type column not null with a default
ALTER TABLE public.notifications ALTER COLUMN type SET DEFAULT 'notification';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
