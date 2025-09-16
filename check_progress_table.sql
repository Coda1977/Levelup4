-- First, check if the table exists and what policies are already there
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'user_progress';

-- Check existing policies
SELECT policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'user_progress';

-- Check the table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_progress'
ORDER BY ordinal_position;