-- Fix infinite recursion in user_profiles RLS policies
-- Step 1: Drop all existing policies that may be causing recursion
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT pol.polname
        FROM pg_policy pol
        JOIN pg_class c ON c.oid = pol.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'user_profiles'
        AND n.nspname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', pol.polname);
        RAISE NOTICE 'Dropped policy: %', pol.polname;
    END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create non-recursive policies

-- Policy 1: Users can view their own profile
-- Uses auth.uid() directly without any subqueries to avoid recursion
CREATE POLICY "Users can view own profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Policy 2: Users can update their own profile
-- Simple direct comparison without any table lookups
CREATE POLICY "Users can update own profile"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy 3: Users can insert their own profile (for initial creation)
-- Only allows users to create profiles for themselves
CREATE POLICY "Users can insert own profile"
    ON public.user_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Policy 4: Service role bypass for triggers and admin operations
-- Uses JWT claim check instead of recursive queries
CREATE POLICY "Service role has full access"
    ON public.user_profiles
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Optional: Allow authenticated users to view all profiles (uncomment if needed)
-- This is a simple policy that doesn't cause recursion
/*
CREATE POLICY "Authenticated users can view all profiles"
    ON public.user_profiles
    FOR SELECT
    USING (
        auth.role() = 'authenticated'
    );
*/

-- Log the final state
DO $$
DECLARE
    policy_count INT;
BEGIN
    SELECT COUNT(*)
    INTO policy_count
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'user_profiles'
    AND n.nspname = 'public';

    RAISE NOTICE 'Created % RLS policies for user_profiles table', policy_count;
END $$;