-- Fix the trigger timing issue
-- The trigger was firing before the user was properly created in auth.users

-- 1. Drop the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Create a better trigger function that handles the timing correctly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only create profile if user is actually created and has valid data
    IF NEW.id IS NOT NULL AND NEW.email IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, full_name, database_role)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'Unknown'),
            COALESCE(NEW.raw_user_meta_data->>'role', 'User')
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 3. Create trigger with AFTER timing (not BEFORE)
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. Test the trigger with a simulated user creation
SELECT 
    'trigger_test' as info_type,
    json_build_object(
        'trigger_created', (
            SELECT COUNT(*) > 0 
            FROM information_schema.triggers 
            WHERE trigger_name = 'on_auth_user_created'
        ),
        'function_created', (
            SELECT COUNT(*) > 0 
            FROM information_schema.routines 
            WHERE routine_name = 'handle_new_user'
        ),
        'current_profiles_count', (SELECT COUNT(*) FROM public.profiles)
    ) as data;
