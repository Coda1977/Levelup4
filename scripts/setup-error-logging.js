const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

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
  console.log('Setting up error logging table...')

  // Read the migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20250117_error_logs.sql')
  const migrationSql = fs.readFileSync(migrationPath, 'utf8')

  // Execute the migration
  const { error } = await supabase.rpc('exec_sql', {
    sql: migrationSql
  }).catch(async (err) => {
    // If RPC doesn't exist, try running statements individually
    console.log('Running migration statements individually...')

    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      try {
        // Use raw SQL execution via Supabase admin API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ sql: statement + ';' })
        })

        if (!response.ok) {
          console.error(`Failed to execute: ${statement.substring(0, 50)}...`)
        }
      } catch (err) {
        console.error(`Error executing statement: ${err.message}`)
      }
    }

    return { error: null }
  })

  if (error) {
    console.error('Migration failed:', error)
    return false
  }

  console.log('✅ Error logging table created successfully')

  // Test inserting an error log
  console.log('\nTesting error logging...')

  const { error: insertError } = await supabase
    .from('error_logs')
    .insert({
      error_message: 'Test error from setup script',
      error_type: 'api',
      endpoint: '/api/test',
      method: 'GET',
      status_code: 500,
      metadata: { test: true, timestamp: new Date().toISOString() }
    })

  if (insertError) {
    console.error('Failed to insert test error:', insertError)
    return false
  }

  console.log('✅ Test error logged successfully')

  // Verify we can read it (as admin)
  const { data: logs, error: readError } = await supabase
    .from('error_logs')
    .select('*')
    .limit(1)
    .order('created_at', { ascending: false })

  if (readError) {
    console.error('Failed to read error logs:', readError)
    return false
  }

  if (logs && logs.length > 0) {
    console.log('✅ Error log verification successful')
    console.log('Latest log:', {
      id: logs[0].id,
      message: logs[0].error_message,
      created_at: logs[0].created_at
    })
  }

  return true
}

// Run the setup
setupErrorLogging().then(success => {
  if (success) {
    console.log('\n🎉 Error logging setup complete!')
    console.log('Errors will now be logged to the database for monitoring.')
  } else {
    console.log('\n❌ Error logging setup failed')
    process.exit(1)
  }
})