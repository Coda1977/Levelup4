-- Check all progress records
SELECT
  up.id,
  up.user_id,
  up.chapter_id,
  up.completed_at,
  u.email as user_email,
  c.title as chapter_title
FROM public.user_progress up
LEFT JOIN auth.users u ON u.id = up.user_id
LEFT JOIN public.chapters c ON c.id = up.chapter_id
ORDER BY up.completed_at DESC;

-- Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_progress';

-- Check all policies
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_progress';