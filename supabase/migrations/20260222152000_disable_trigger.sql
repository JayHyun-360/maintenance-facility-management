-- Disable trigger temporarily to fix OAuth server_error
-- Profile creation will be handled by callback route fallback

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Also drop the function to avoid any issues
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Verify trigger is gone
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count 
    FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created';
    
    IF trigger_count = 0 THEN
        RAISE NOTICE '✅ Trigger on_auth_user_created removed - OAuth should work now';
    ELSE
        RAISE NOTICE '❌ Trigger still exists';
    END IF;
END;
$$;
