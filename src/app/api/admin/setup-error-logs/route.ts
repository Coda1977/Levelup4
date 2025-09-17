import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { createClient } from '@/lib/supabase-client'

// SQL to create error_logs table
const CREATE_ERROR_LOGS_SQL = `
-- Create error_logs table for basic monitoring
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_type VARCHAR(50),
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INTEGER,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON public.error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service can insert error logs" ON public.error_logs
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Admins can view error logs" ON public.error_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );
`

export async function POST(request: NextRequest) {
  // Verify admin auth
  const authResult = await verifyAdminAuth()
  if (!authResult.isAuthorized) {
    return authResult.response!
  }

  try {
    const supabase = await createClient()

    // Check if table already exists
    const { data: existing } = await supabase
      .from('error_logs')
      .select('id')
      .limit(1)

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Error logs table already exists'
      })
    }

    // Since we can't execute raw SQL through Supabase client,
    // we'll return the SQL for manual execution
    return NextResponse.json({
      success: false,
      message: 'Please run the following SQL in your Supabase dashboard',
      sql: CREATE_ERROR_LOGS_SQL
    })

  } catch (error) {
    console.error('Setup error logs error:', error)
    return NextResponse.json(
      { error: 'Failed to setup error logs' },
      { status: 500 }
    )
  }
}

// Test endpoint to verify error logging works
export async function GET(request: NextRequest) {
  // Verify admin auth
  const authResult = await verifyAdminAuth()
  if (!authResult.isAuthorized) {
    return authResult.response!
  }

  try {
    const supabase = await createClient()

    // Get recent error logs
    const { data: logs, error } = await supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      // Table doesn't exist yet
      if (error.code === '42P01') {
        return NextResponse.json({
          error: 'Error logs table does not exist. Please run POST to set it up.'
        }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      count: logs?.length || 0,
      logs
    })

  } catch (error) {
    console.error('Get error logs error:', error)
    return NextResponse.json(
      { error: 'Failed to get error logs' },
      { status: 500 }
    )
  }
}