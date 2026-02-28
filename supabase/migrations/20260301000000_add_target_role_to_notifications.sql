-- Add target_role column to notifications to distinguish admin vs user notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT 'admin';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_role ON public.notifications(user_id, target_role);

-- Update existing notifications to be admin notifications
UPDATE public.notifications SET target_role = 'admin' WHERE target_role IS NULL;
