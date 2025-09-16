-- Check ALL policies on user_profiles
SELECT
    pol.polname as policy_name,
    pol.polcmd as command,
    pol.polpermissive as permissive,
    pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
WHERE nsp.nspname = 'public'
AND cls.relname = 'user_profiles';

-- Check if RLS is enabled
SELECT relrowsecurity
FROM pg_class
WHERE relname = 'user_profiles'
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check for any triggers that might reference user_profiles
SELECT
    tg.tgname as trigger_name,
    pg_get_triggerdef(tg.oid) as trigger_definition
FROM pg_trigger tg
JOIN pg_class cls ON tg.tgrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
WHERE nsp.nspname = 'public'
AND cls.relname = 'user_profiles'
AND NOT tg.tgisinternal;