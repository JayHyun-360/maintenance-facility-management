-- ==========================================
-- Add Test Account Column to Profiles
-- ==========================================

-- Add is_test_account column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.is_test_account IS 'Flag to identify test accounts for debugging';
