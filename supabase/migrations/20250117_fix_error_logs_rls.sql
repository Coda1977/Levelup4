-- Fix RLS policies for error_logs table
-- Allow both service_role AND anon key to insert errors

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Service role can insert error logs" ON public.error_logs;

-- Create new policy that allows any authenticated request to insert
-- This includes both anon key and service role
CREATE POLICY "Allow error log inserts"
  ON public.error_logs
  FOR INSERT
  WITH CHECK (true);

-- Keep the admin read policy as is
-- (It should already exist from previous migration)