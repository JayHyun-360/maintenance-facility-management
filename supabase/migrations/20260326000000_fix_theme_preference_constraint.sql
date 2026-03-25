-- Fix theme_preference CHECK constraint
-- Drop and recreate the constraint to ensure it's properly defined

-- First, find and drop the existing constraint
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint on theme_preference
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
    AND conkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.profiles'::regclass AND attname = 'theme_preference')
    AND contype = 'c';

    -- Drop it if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END IF;
END $$;

-- Add the constraint with explicit valid values
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_theme_preference_check
CHECK (theme_preference IN ('light', 'dark', 'system'));

-- Also ensure the default is set
ALTER TABLE public.profiles
ALTER COLUMN theme_preference SET DEFAULT 'system';
