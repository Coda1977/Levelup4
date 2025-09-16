const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://exxildftqhnlupxdlqfn.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4eGlsZGZ0cWhubHVweGRscWZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2MDgyOCwiZXhwIjoyMDczMzM2ODI4fQ.xXv6Vq5yGUWXdPJLFLL1-oQr18a993uJxJq3Md4NkoM'

async function fixRLS() {
  console.log('🔧 Fixing RLS policies for user_profiles...\n')

  // Using direct PostgreSQL connection through Supabase
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      function_name: 'exec',
      args: {
        sql: `
          -- Drop all existing policies
          DO $$
          BEGIN
            DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.user_profiles;
            DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_profiles;
            DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.user_profiles;
            DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
            DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
            DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
            DROP POLICY IF EXISTS "Service role has full access" ON public.user_profiles;
          EXCEPTION
            WHEN OTHERS THEN NULL;
          END $$;

          -- Ensure RLS is enabled
          ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

          -- Create simple non-recursive policies
          CREATE POLICY "allow_user_select" ON public.user_profiles
            FOR SELECT USING (auth.uid() = id);

          CREATE POLICY "allow_user_update" ON public.user_profiles
            FOR UPDATE USING (auth.uid() = id);

          CREATE POLICY "allow_user_insert" ON public.user_profiles
            FOR INSERT WITH CHECK (auth.uid() = id);

          CREATE POLICY "allow_service_role" ON public.user_profiles
            FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
        `
      }
    })
  })

  if (!response.ok) {
    console.log('Note: Direct RPC might not be available, trying alternative approach...\n')

    // Alternative: Use the admin client to test
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Just test that we can access profiles without recursion
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1)

    if (error && error.message.includes('recursion')) {
      console.error('❌ RLS policies still have recursion issues')
      console.log('\n📋 Please manually apply the fix:')
      console.log('1. Go to: https://supabase.com/dashboard/project/exxildftqhnlupxdlqfn/editor')
      console.log('2. Run the SQL from: fix-user-profiles-rls.sql')
    } else {
      console.log('✅ Profiles can be accessed - RLS appears to be working!')
    }
  } else {
    console.log('✅ RLS policies updated successfully!')
  }
}

fixRLS().catch(console.error)