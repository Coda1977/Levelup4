-- Create error_logs table for basic monitoring
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Error details
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_type VARCHAR(50), -- 'api', 'auth', 'database', 'validation', etc.

  -- Context
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INTEGER,

  -- User info (if available)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,

  -- Request details
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Additional data
  metadata JSONB
);

-- Index for querying recent errors
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);

-- Index for filtering by type
CREATE INDEX idx_error_logs_type ON public.error_logs(error_type);

-- Index for user-specific errors
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);

-- RLS policies (only admins can read error logs)
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert (for API logging)
CREATE POLICY "Service role can insert error logs"
  ON public.error_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow admins to view all error logs
CREATE POLICY "Admins can view error logs"
  ON public.error_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Comment for documentation
COMMENT ON TABLE public.error_logs IS 'Simple error logging for production monitoring';