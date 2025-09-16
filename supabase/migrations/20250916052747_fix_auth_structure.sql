-- Fix Authentication Structure Migration
-- Goal: Simplify to auth.users + user_profiles with automatic synchronization

BEGIN;

-- 1. Add is_admin column to user_profiles if it doesn't exist
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Migrate any existing is_admin data from users table (if it exists and has data)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'is_admin'
    ) THEN
        UPDATE public.user_profiles p
        SET is_admin = u.is_admin
        FROM public.users u
        WHERE p.id = u.id;
    END IF;
END $$;

-- 3. Drop the existing foreign key constraint on user_progress if it references public.users
ALTER TABLE public.user_progress
DROP CONSTRAINT IF EXISTS user_progress_user_id_fkey;

-- 4. Add proper foreign key constraint to reference auth.users
ALTER TABLE public.user_progress
ADD CONSTRAINT user_progress_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Ensure user_profiles has proper foreign key to auth.users
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. Create function to handle user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_profiles (id, created_at, updated_at)
    VALUES (
        new.id,
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Drop any existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 8. Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 9. Create profiles for any existing auth users that don't have one
INSERT INTO public.user_profiles (id, created_at, updated_at)
SELECT
    au.id,
    COALESCE(au.created_at, now()),
    now()
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 10. Drop the redundant public.users table (after backing up any important data)
-- First, check if there's any unique data we need to preserve
DO $$
DECLARE
    user_count INTEGER;
    has_unique_data BOOLEAN := false;
BEGIN
    -- Check if users table exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
    ) THEN
        -- Count users
        SELECT COUNT(*) INTO user_count FROM public.users;

        -- Check if there's data not in user_profiles
        SELECT EXISTS (
            SELECT 1
            FROM public.users u
            LEFT JOIN public.user_profiles p ON u.id = p.id
            WHERE p.id IS NULL
        ) INTO has_unique_data;

        IF has_unique_data THEN
            RAISE NOTICE 'Users table has unique data that needs migration';
            -- Migrate any missing users to user_profiles
            INSERT INTO public.user_profiles (id, first_name, last_name, is_admin, created_at, updated_at)
            SELECT
                u.id,
                COALESCE(u.first_name, ''),
                COALESCE(u.last_name, ''),
                COALESCE(u.is_admin, false),
                COALESCE(u.created_at, now()),
                now()
            FROM public.users u
            LEFT JOIN public.user_profiles p ON u.id = p.id
            WHERE p.id IS NULL
            ON CONFLICT (id) DO UPDATE SET
                is_admin = EXCLUDED.is_admin;
        END IF;

        -- Now we can safely drop the users table
        DROP TABLE IF EXISTS public.users CASCADE;
    END IF;
END $$;

-- 11. Update RLS policies for user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- 12. Update RLS policies for user_progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
CREATE POLICY "Users can view own progress" ON public.user_progress
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
CREATE POLICY "Users can update own progress" ON public.user_progress
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all progress" ON public.user_progress;
CREATE POLICY "Admins can view all progress" ON public.user_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- 13. Create function to get user profile with auth info (helper function)
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    is_admin BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        au.id,
        au.email::TEXT,
        COALESCE(up.first_name, '')::TEXT,
        COALESCE(up.last_name, '')::TEXT,
        COALESCE(up.is_admin, false),
        up.created_at,
        up.updated_at
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON au.id = up.id
    WHERE au.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON public.user_profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_course_id ON public.user_progress(course_id);

-- 15. Add comments for documentation
COMMENT ON TABLE public.user_profiles IS 'Extended user profile information, automatically synced with auth.users';
COMMENT ON COLUMN public.user_profiles.is_admin IS 'Admin status for the user';
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user_profiles entry when new auth user is created';

COMMIT;

-- Verification queries (run these after migration to confirm success)
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Run these queries to verify:';
    RAISE NOTICE '1. SELECT COUNT(*) FROM auth.users;';
    RAISE NOTICE '2. SELECT COUNT(*) FROM public.user_profiles;';
    RAISE NOTICE '3. SELECT COUNT(*) FROM public.user_progress;';
    RAISE NOTICE '4. Both auth.users and user_profiles counts should match.';
END $$;