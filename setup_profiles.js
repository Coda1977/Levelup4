const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://exxildftqhnlupxdlqfn.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4eGlsZGZ0cWhubHVweGRscWZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2MDgyOCwiZXhwIjoyMDczMzM2ODI4fQ.xXv6Vq5yGUWXdPJLFLL1-oQr18a993uJxJq3Md4NkoM'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupProfiles() {
  console.log('Setting up user profiles...')

  try {
    // Enable RLS
    const { error: rlsError } = await supabase.rpc('query', {
      query: 'ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY'
    })
    if (rlsError) console.log('RLS might already be enabled')

    // Create policies
    const policies = [
      {
        name: 'Users can view their own profile',
        query: `CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id)`
      },
      {
        name: 'Users can update their own profile',
        query: `CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id)`
      },
      {
        name: 'Users can insert their own profile',
        query: `CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id)`
      }
    ]

    for (const policy of policies) {
      console.log(`Creating policy: ${policy.name}`)
      const { error } = await supabase.rpc('query', { query: policy.query })
      if (error) console.log(`Policy might already exist: ${error.message}`)
    }

    // Create function for auto-creating profiles
    const functionQuery = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
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
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `

    console.log('Creating trigger function...')
    const { error: funcError } = await supabase.rpc('query', { query: functionQuery })
    if (funcError) console.log('Function error:', funcError.message)

    // Create trigger
    const triggerQuery = `
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_new_user();
    `

    console.log('Creating trigger...')
    const { error: triggerError } = await supabase.rpc('query', { query: triggerQuery })
    if (triggerError) console.log('Trigger error:', triggerError.message)

    console.log('Setup complete!')
  } catch (error) {
    console.error('Setup error:', error)
  }
}

setupProfiles()