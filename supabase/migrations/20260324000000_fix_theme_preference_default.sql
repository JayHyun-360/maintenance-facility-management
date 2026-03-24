-- Fix theme_preference check constraint by adding DEFAULT value
-- This ensures any insert (including those from triggers) gets a valid value

ALTER TABLE public.profiles 
ALTER COLUMN theme_preference SET DEFAULT 'system';
