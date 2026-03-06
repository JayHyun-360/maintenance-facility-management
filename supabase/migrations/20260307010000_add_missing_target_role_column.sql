-- Fix all missing columns causing 400 Bad Request errors

-- 1. Add missing target_role column to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT 'user';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_role ON public.notifications(user_id, target_role);

-- Update any existing notifications to have target_role = 'user'
UPDATE public.notifications SET target_role = 'user' WHERE target_role IS NULL;

-- 2. Add missing photos column to maintenance_requests table
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';
