-- Debug: Check if profiles table and trigger are actually working
-- This will help us identify the exact issue

-- 1. Check if profiles table exists and is accessible
SELECT 
    'table_check' as info_type,
    json_build_object(
        'table_exists', (
            SELECT COUNT(*) > 0 
            FROM information_schema.tables 
            WHERE table_name = 'profiles' AND table_schema = 'public'
        ),
        'row_count', (SELECT COUNT(*) FROM public.profiles),
        'sample_data', (
            SELECT json_agg(
                json_build_object(
                    'id', id,
                    'email', email,
                    'database_role', database_role,
                    'created_at', created_at
                )
            )
            FROM public.profiles 
            LIMIT 3
        )
    ) as data;

-- 2. Check if trigger exists and is working
SELECT 
    'trigger_check' as info_type,
    json_build_object(
        'trigger_exists', (
            SELECT COUNT(*) > 0 
            FROM information_schema.triggers 
            WHERE trigger_name = 'on_auth_user_created'
        ),
        'trigger_function', (
            SELECT COUNT(*) > 0 
            FROM information_schema.routines 
            WHERE routine_name = 'handle_new_user'
        )
    ) as data;

-- 3. Test manual profile creation
DO $$
BEGIN
    -- Try to create a test profile to see if it works
    INSERT INTO public.profiles (id, email, full_name, database_role)
    VALUES (
        gen_random_uuid(),
        'test@example.com',
        'Test User',
        'User'
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Test profile creation successful';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test profile creation failed: %', SQLERRM;
END $$;

-- 4. Check RLS policies
SELECT 
    'rls_check' as info_type,
    json_build_object(
        'policy_count', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles'),
        'policies', (
            SELECT json_agg(
                json_build_object(
                    'policy_name', policyname,
                    'command', cmd
                )
            )
            FROM pg_policies 
            WHERE tablename = 'profiles'
        )
    ) as data;