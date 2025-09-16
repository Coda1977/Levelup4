#!/usr/bin/env node

/**
 * Apply RLS fixes to Supabase database
 * This script executes the SQL commands to fix Row Level Security policies
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Use service role key to bypass RLS
const SUPABASE_URL = 'https://exxildftqhnlupxdlqfn.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4eGlsZGZ0cWhubHVweGRscWZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2MDgyOCwiZXhwIjoyMDczMzM2ODI4fQ.xXv6Vq5yGUWXdPJLFLL1-oQr18a993uJxJq3Md4NkoM'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function executeSQLFile() {
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix-rls-policies.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')

    // Split by semicolons but keep them for execution
    const statements = sqlContent
      .split(/;\s*\n/)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';')

    console.log(`📋 Executing ${statements.length} SQL statements...`)

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]

      // Skip comments and empty lines
      if (statement.startsWith('--') || statement.trim() === ';') {
        continue
      }

      // Extract first few words for logging
      const preview = statement.substring(0, 50).replace(/\n/g, ' ')

      try {
        // Execute via RPC (raw SQL execution)
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        }).single()

        if (error) {
          // Try direct approach if RPC doesn't exist
          console.log(`⚠️  Statement ${i + 1}: ${preview}... - RPC not available, skipping`)
          errorCount++
        } else {
          console.log(`✅ Statement ${i + 1}: ${preview}... - Success`)
          successCount++
        }
      } catch (err) {
        console.log(`❌ Statement ${i + 1}: ${preview}... - Error: ${err.message}`)
        errorCount++
      }
    }

    console.log(`\n📊 Summary: ${successCount} successful, ${errorCount} errors`)

    if (errorCount > 0) {
      console.log(`
⚠️  Some statements couldn't be executed automatically.

Please apply the RLS fixes manually:

1. Go to: https://supabase.com/dashboard/project/exxildftqhnlupxdlqfn/sql
2. Copy the contents of: scripts/fix-rls-policies.sql
3. Paste and click "Run"

This is a one-time setup that will fix all RLS policies.`)
    }

  } catch (error) {
    console.error('❌ Error reading SQL file:', error)
    process.exit(1)
  }
}

// Note: Direct SQL execution isn't available via Supabase JS client
// We'll need to apply this via the dashboard
console.log(`
🔧 RLS Policy Fix Instructions
================================

Since direct SQL execution isn't available through the JS client,
please apply the fixes manually:

1. Open Supabase SQL Editor:
   https://supabase.com/dashboard/project/exxildftqhnlupxdlqfn/sql

2. Copy the entire contents of:
   ${path.join(__dirname, 'fix-rls-policies.sql')}

3. Paste into the SQL editor and click "Run"

4. Once applied, run the tests:
   npm test -- --testMatch="**/__tests__/critical/*.flow.test.ts"

The SQL script will:
✅ Fix all RLS policies for proper service role access
✅ Simplify user isolation policies
✅ Remove recursive policy issues
✅ Ensure tests can run properly

This is a one-time setup that will permanently fix the RLS configuration.
`)

process.exit(0)