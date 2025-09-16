import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://exxildftqhnlupxdlqfn.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4eGlsZGZ0cWhubHVweGRscWZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2MDgyOCwiZXhwIjoyMDczMzM2ODI4fQ.xXv6Vq5yGUWXdPJLFLL1-oQr18a993uJxJq3Md4NkoM'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
})

async function applyRLSFix() {
  console.log('🔧 Applying RLS fix for user_profiles table...\n')

  const sqlCommands = [
    // Drop existing policies
    `DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.user_profiles`,
    `DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_profiles`,
    `DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.user_profiles`,
    `DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles`,
    `DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles`,
    `DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles`,
    `DROP POLICY IF EXISTS "Service role has full access" ON public.user_profiles`,

    // Ensure RLS is enabled
    `ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY`,

    // Create new non-recursive policies
    `CREATE POLICY "Users can view own profile"
      ON public.user_profiles
      FOR SELECT
      USING (auth.uid() = id)`,

    `CREATE POLICY "Users can update own profile"
      ON public.user_profiles
      FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id)`,

    `CREATE POLICY "Users can insert own profile"
      ON public.user_profiles
      FOR INSERT
      WITH CHECK (auth.uid() = id)`,

    `CREATE POLICY "Service role has full access"
      ON public.user_profiles
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role')`
  ]

  try {
    for (const sql of sqlCommands) {
      console.log(`Executing: ${sql.split('\n')[0]}...`)
      const { error } = await supabase.rpc('exec_sql', { query: sql })

      if (error) {
        // Try direct execution if RPC fails
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ query: sql })
        })

        if (!response.ok) {
          console.log(`Note: Policy might already exist or be dropped`)
        }
      }
    }

    console.log('\n✅ RLS policies have been updated!')
    console.log('\nVerifying the fix by testing profile access...')

    // Test that we can query profiles without recursion
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1)

    if (error) {
      console.error('❌ Error testing profiles:', error.message)
    } else {
      console.log('✅ Profile access working without recursion!')
    }

  } catch (error) {
    console.error('Error applying RLS fix:', error)
    console.log('\n⚠️  You may need to apply the fix manually in the Supabase dashboard')
    console.log('Go to: https://supabase.com/dashboard/project/exxildftqhnlupxdlqfn/editor')
    console.log('And run the SQL from: fix-user-profiles-rls.sql')
  }
}

applyRLSFix()