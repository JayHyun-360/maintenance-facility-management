-- Night Blue Theme Implementation
-- Add 'night_blue' to theme_preference CHECK constraint

-- Drop existing constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_theme_preference_check;

-- Add new constraint with night_blue option
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_theme_preference_check 
CHECK (theme_preference IN ('light', 'dark', 'night_blue'));

-- Note: Existing 'system' values will remain but won't be selectable in UI
-- Existing 'dark' values will work but won't show in UI (only light/night_blue are used)
