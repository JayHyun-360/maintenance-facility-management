-- Fix handle_new_user trigger with proper schema qualification and error handling
-- This fixes the "relation profiles does not exist" error during OAuth

-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate function with explicit schema and error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert with explicit schema qualification
    INSERT INTO public.profiles (id, email, full_name, database_role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'full_name',
            NEW.email,
            'Unknown'
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'database_role',
            'User'
        )
    );
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log error but don't fail the auth
        -- Profile will be created by fallback in callback
        RAISE WARNING 'handle_new_user trigger failed: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Verify trigger exists
DO $$
DECLARE
    trigger_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    IF trigger_exists THEN
        RAISE NOTICE '✅ Trigger on_auth_user_created exists';
    ELSE
        RAISE NOTICE '❌ Trigger on_auth_user_created does NOT exist';
    END IF;
END;
$$;
