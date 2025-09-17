const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupErrorLogging() {
  console.log('Setting up error logging...\n')

  // First, check if the table already exists
  const { data: existing } = await supabase
    .from('error_logs')
    .select('id')
    .limit(1)

  if (!existing) {
    console.log('❌ Error logs table does not exist yet.')
    console.log('Please run this SQL in Supabase dashboard:\n')
    console.log('-- Create error_logs table for basic monitoring')
    console.log('CREATE TABLE IF NOT EXISTS public.error_logs (')
    console.log('  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,')
    console.log('  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,')
    console.log('  error_message TEXT NOT NULL,')
    console.log('  error_stack TEXT,')
    console.log('  error_type VARCHAR(50),')
    console.log('  endpoint VARCHAR(255),')
    console.log('  method VARCHAR(10),')
    console.log('  status_code INTEGER,')
    console.log('  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,')
    console.log('  user_email TEXT,')
    console.log('  ip_address VARCHAR(45),')
    console.log('  user_agent TEXT,')
    console.log('  metadata JSONB')
    console.log(');')
    console.log('\n-- Create indexes')
    console.log('CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);')
    console.log('CREATE INDEX idx_error_logs_type ON public.error_logs(error_type);')
    console.log('CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);')
    console.log('\n-- Enable RLS')
    console.log('ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;')
    console.log('\nThen run this script again to test.')
    return
  }

  console.log('✅ Error logs table exists')

  // Test inserting an error log
  console.log('\nTesting error logging...')

  const testError = {
    error_message: 'Test error from setup script',
    error_type: 'api',
    endpoint: '/api/test',
    method: 'GET',
    status_code: 500,
    metadata: {
      test: true,
      timestamp: new Date().toISOString(),
      description: 'This is a test error to verify the monitoring system works'
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('error_logs')
    .insert(testError)
    .select()
    .single()

  if (insertError) {
    console.error('❌ Failed to insert test error:', insertError.message)
    return
  }

  console.log('✅ Test error logged successfully')
  console.log('   ID:', inserted.id)
  console.log('   Created:', inserted.created_at)

  // Verify we can read it
  const { data: logs, error: readError } = await supabase
    .from('error_logs')
    .select('*')
    .eq('id', inserted.id)
    .single()

  if (readError) {
    console.error('❌ Failed to read error log:', readError.message)
    return
  }

  console.log('✅ Error log verified successfully')

  // Clean up test error
  await supabase
    .from('error_logs')
    .delete()
    .eq('id', inserted.id)

  console.log('✅ Test error cleaned up')

  console.log('\n🎉 Error logging is working!')
  console.log('   - Errors from API routes will be logged automatically')
  console.log('   - Only 500+ errors are logged (not client errors)')
  console.log('   - Admins can view logs in the database')
}

setupErrorLogging()