-- Emergency Fix: Check and create profiles table in correct schema
-- The error suggests profiles table still doesn't exist

-- 1. First, check what tables actually exist
SELECT 
    'existing_tables' as info_type,
    json_build_object(
        'tables', (
            SELECT json_agg(table_name)
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
        )
    ) as data;

-- 2. Force create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
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

-- 3. Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Drop and recreate policies to ensure they work
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- 5. Create working RLS policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'Admin'
        )
    );

-- 6. Verify table was created
SELECT 
    'profiles_creation_result' as info_type,
    json_build_object(
        'table_exists', (
            SELECT COUNT(*) > 0 
            FROM information_schema.tables 
            WHERE table_name = 'profiles' AND table_schema = 'public'
        ),
        'row_count', (SELECT COUNT(*) FROM public.profiles)
    ) as data;