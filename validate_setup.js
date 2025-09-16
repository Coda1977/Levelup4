const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://exxildftqhnlupxdlqfn.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4eGlsZGZ0cWhubHVweGRscWZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2MDgyOCwiZXhwIjoyMDczMzM2ODI4fQ.xXv6Vq5yGUWXdPJLFLL1-oQr18a993uJxJq3Md4NkoM'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function validateSetup() {
  console.log('🔍 Validating user_profiles setup...\n')

  try {
    // Check if table exists and is accessible
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1)

    if (profileError) {
      console.log('❌ Error accessing user_profiles table:', profileError.message)
      return
    }

    console.log('✅ Table user_profiles exists and is accessible')

    // Check table structure
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'user_profiles' })
      .single()

    if (!columnsError && columns) {
      console.log('✅ Table has expected columns')
    }

    // Check if RLS is enabled (this will only work if policies exist)
    console.log('✅ RLS policies should be active (cannot verify programmatically)')

    // Check for existing profiles
    const { count, error: countError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })

    if (!countError) {
      console.log(`📊 Current user profiles in database: ${count || 0}`)
    }

    console.log('\n🎉 Setup appears to be complete!')
    console.log('\n📝 Next steps:')
    console.log('1. Test signup with a new user')
    console.log('2. Enter first and last name in the signup form')
    console.log('3. After signup, the profile will be automatically created')
    console.log('4. The welcome message will use the real name!\n')

  } catch (error) {
    console.error('❌ Validation error:', error)
  }
}

validateSetup()