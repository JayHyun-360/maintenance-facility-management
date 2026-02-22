-- Critical Fix: Ensure trigger function works in Auth service context
-- The Auth service runs with a different search_path, causing "relation profiles does not exist"

-- Drop trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate function with FULLY QUALIFIED table name and explicit search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- Force fully qualified names
AS $$
BEGIN
    -- Use FULLY QUALIFIED table name: public.profiles
    INSERT INTO public.profiles (id, email, full_name, database_role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'full_name',
            SPLIT_PART(NEW.email, '@', 1),
            'Unknown'
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'database_role',
            'User'
        ),
        NOW(),
        NOW()
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Profile already exists, ignore
        RETURN NEW;
    WHEN undefined_table THEN
        -- Table doesn't exist in current context - this shouldn't happen but handle gracefully
        RAISE WARNING 'handle_new_user: public.profiles table not found';
        RETURN NEW;
    WHEN others THEN
        -- Log any other error but don't fail auth
        RAISE WARNING 'handle_new_user error: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticator;
GRANT ALL ON public.profiles TO authenticator;

-- Verify
DO $$
DECLARE
    fn_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user' AND pronamespace = 'public'::regnamespace
    ) INTO fn_exists;
    
    IF fn_exists THEN
        RAISE NOTICE '✅ Function public.handle_new_user exists';
    ELSE
        RAISE NOTICE '❌ Function public.handle_new_user NOT found';
    END IF;
END;
$$;
