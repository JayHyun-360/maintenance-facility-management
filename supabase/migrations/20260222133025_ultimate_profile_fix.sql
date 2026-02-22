-- Emergency Profile Creation Fix
-- The issue is that profiles table might not be accessible during auth callback

-- 1. Force create profiles table with explicit schema
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    database_role VARCHAR(20) DEFAULT 'User' CHECK (database_role IN ('Admin', 'User')),
    visual_role VARCHAR(20) CHECK (visual_role IN ('Teacher', 'Staff', 'Student')),
    educational_level VARCHAR(20),
    department TEXT,
    is_guest BOOLEAN DEFAULT FALSE,
    first_login_completed BOOLEAN DEFAULT FALSE,
    user_type VARCHAR(20) DEFAULT 'guest',
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_database_role ON public.profiles(database_role);
CREATE INDEX IF NOT EXISTS idx_profiles_visual_role ON public.profiles(visual_role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_guest ON public.profiles(is_guest);

-- 3. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create simple RLS policies that don't rely on auth.users metadata
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (database_role = 'Admin');

-- 5. Create a trigger to automatically create profiles when users are created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, database_role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'Unknown'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'User')
    );
    RETURN NEW;
END;
$$;

-- 6. Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 7. Verify everything exists
SELECT 
    'verification' as info_type,
    json_build_object(
        'profiles_table_exists', (
            SELECT COUNT(*) > 0 
            FROM information_schema.tables 
            WHERE table_name = 'profiles' AND table_schema = 'public'
        ),
        'trigger_exists', (
            SELECT COUNT(*) > 0 
            FROM information_schema.triggers 
            WHERE trigger_name = 'on_auth_user_created'
        ),
        'function_exists', (
            SELECT COUNT(*) > 0 
            FROM information_schema.routines 
            WHERE routine_name = 'handle_new_user'
        ),
        'policy_count', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles')
    ) as data;