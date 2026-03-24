-- Add is_cleared_by_user column to allow users to hide their own requests
-- The data remains in database for admin visibility

ALTER TABLE public.maintenance_requests 
ADD COLUMN IF NOT EXISTS is_cleared_by_user BOOLEAN DEFAULT false;
