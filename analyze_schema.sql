-- Analyze current database structure
-- 1. Check all user-related tables
SELECT
    table_schema,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name IN ('users', 'user_profiles', 'user_progress')
    AND table_schema IN ('public', 'auth')
ORDER BY table_schema, table_name, ordinal_position;

-- 2. Check foreign key constraints
SELECT
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND (tc.table_name IN ('users', 'user_profiles', 'user_progress')
         OR ccu.table_name IN ('users', 'user_profiles'))
ORDER BY tc.table_name;

-- 3. Check existing triggers
SELECT
    trigger_name,
    event_manipulation,
    event_object_schema,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
    OR event_object_table IN ('users', 'user_profiles', 'user_progress');

-- 4. Check functions related to user management
SELECT
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND (routine_name LIKE '%user%' OR routine_name LIKE '%profile%');

-- 5. Check RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('users', 'user_profiles', 'user_progress');