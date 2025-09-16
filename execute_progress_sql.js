const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://exxildftqhnlupxdlqfn.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4eGlsZGZ0cWhubHVweGRscWZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjA3MDA5MCwiZXhwIjoyMDUxNjQ2MDkwfQ.vBhRhfhSMF4rD5S9wUZKmvyDjNsYePe3vFvDRLqpLPE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeSql() {
  const sql = fs.readFileSync('create_progress_table.sql', 'utf8')

  console.log('Executing SQL to create user_progress table...')

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(err => {
    // If RPC doesn't exist, try direct approach
    console.log('RPC failed, please run the SQL manually in Supabase dashboard')
    return { error: err }
  })

  if (error) {
    console.error('Error:', error)
    console.log('\nPlease run the SQL manually in your Supabase dashboard SQL editor')
  } else {
    console.log('Success! User progress table created.')
  }
}

executeSql()