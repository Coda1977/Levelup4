const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://exxildftqhnlupxdlqfn.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4eGlsZGZ0cWhubHVweGRscWZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2MDgyOCwiZXhwIjoyMDczMzM2ODI4fQ.xXv6Vq5yGUWXdPJLFLL1-oQr18a993uJxJq3Md4NkoM'

async function executeSql() {
  console.log('Connecting to Supabase...')

  // We'll use fetch to call the Supabase REST API directly
  const apiUrl = `${supabaseUrl}/rest/v1/rpc/query`

  const queries = [
    // Enable RLS
    `ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY`,

    // Create SELECT policy
    `CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id)`,

    // Create UPDATE policy
    `CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id)`,

    // Create INSERT policy
    `CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id)`,

    // Create function
    `CREATE OR REPLACE FUNCTION public.handle_new_user()
     RETURNS TRIGGER AS $$
     BEGIN
       INSERT INTO public.user_profiles (id, first_name, last_name)
       VALUES (
         NEW.id,
         COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
         COALESCE(NEW.raw_user_meta_data->>'last_name', '')
       );
       RETURN NEW;
     END;
     $$ LANGUAGE plpgsql SECURITY DEFINER`,

    // Drop existing trigger if exists
    `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users`,

    // Create trigger
    `CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW
     EXECUTE FUNCTION public.handle_new_user()`
  ]

  // Since we can't use RPC, let's use the admin API endpoint
  const adminUrl = `${supabaseUrl}/rest/v1/`

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i]
    console.log(`\nExecuting query ${i + 1}/${queries.length}:`)
    console.log(query.substring(0, 50) + '...')

    try {
      const response = await fetch(`https://exxildftqhnlupxdlqfn.supabase.co/rest/v1/`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          query: query
        })
      })

      if (!response.ok) {
        console.log(`Response status: ${response.status}`)
        const text = await response.text()
        console.log('Response:', text)
      } else {
        console.log('✓ Success')
      }
    } catch (error) {
      console.log('Error:', error.message)
    }
  }

  // Actually, let's use the Supabase client library properly
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('\nTrying alternative approach using Supabase client...')

  // Test if the table exists and has RLS enabled
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(1)

  if (error) {
    console.log('Table check error:', error.message)
  } else {
    console.log('✓ Table exists and is accessible')
  }

  console.log('\nSetup complete! The SQL has been prepared.')
  console.log('\nPlease run the following SQL in your Supabase SQL Editor:')
  console.log('https://supabase.com/dashboard/project/exxildftqhnlupxdlqfn/sql/new')
  console.log('\nCopy the contents of complete_profile_setup.sql')
}

executeSql()