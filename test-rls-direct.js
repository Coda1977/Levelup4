const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://exxildftqhnlupxdlqfn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4eGlsZGZ0cWhubHVweGRscWZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2MDgyOCwiZXhwIjoyMDczMzM2ODI4fQ.xXv6Vq5yGUWXdPJLFLL1-oQr18a993uJxJq3Md4NkoM' // Service role key
)

async function testRLS() {
  console.log('Testing RLS directly...\n')

  try {
    // Test 1: Simple select
    console.log('1. Testing simple SELECT on user_profiles...')
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1)

    if (error) {
      console.error('❌ SELECT failed:', error.message)
    } else {
      console.log('✅ SELECT works! Got', data?.length || 0, 'profiles')
    }

    // Test 2: Get current RLS policies
    console.log('\n2. Checking current RLS policies...')
    const { data: policies, error: policyError } = await supabase
      .rpc('get_policies', { table_name: 'user_profiles' })
      .single()

    if (!policyError && policies) {
      console.log('Current policies:', policies)
    }

    // Test 3: Check RLS status
    console.log('\n3. Checking if RLS is enabled...')
    const { data: rlsStatus } = await supabase
      .from('pg_tables')
      .select('rowsecurity')
      .eq('schemaname', 'public')
      .eq('tablename', 'user_profiles')
      .single()

    console.log('RLS enabled?:', rlsStatus?.rowsecurity || false)

  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

testRLS()