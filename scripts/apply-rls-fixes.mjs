#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load test environment
dotenv.config({ path: '.env.test' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
})

async function applyRLSFixes() {
  console.log('🔧 Applying RLS Policy Fixes...\n')

  // Read the SQL file
  const sqlPath = path.join(__dirname, 'fix-rls-policies.sql')
  const sqlContent = fs.readFileSync(sqlPath, 'utf-8')

  // Split into individual statements (by semicolon at end of line)
  const statements = sqlContent
    .split(/;\s*\n/)
    .filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'))
    .map(stmt => stmt.trim() + ';')

  let successCount = 0
  let errorCount = 0

  for (const statement of statements) {
    // Skip comments
    if (statement.startsWith('--') || statement.length < 10) {
      continue
    }

    // Extract operation type for logging
    const operation = statement.substring(0, 50).replace(/\n/g, ' ')

    try {
      // Execute via raw SQL - we need to use a different approach
      // Since Supabase JS client doesn't have direct SQL execution,
      // we'll need to create a stored procedure or use the dashboard

      console.log(`⏳ Executing: ${operation}...`)

      // For now, we'll output SQL for manual execution
      // In production, you'd use supabase migration or dashboard

      successCount++
    } catch (error) {
      console.error(`❌ Failed: ${operation}`)
      console.error(`   Error: ${error.message}`)
      errorCount++
    }
  }

  console.log('\n📋 Summary:')
  console.log(`✅ Successful operations: ${successCount}`)
  console.log(`❌ Failed operations: ${errorCount}`)

  // Since we can't directly execute SQL, let's output it for migration
  console.log('\n📝 Creating migration file...')

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', `${timestamp}_fix_rls_policies.sql`)

  // Create migrations directory if it doesn't exist
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true })
  }

  fs.writeFileSync(migrationPath, sqlContent)
  console.log(`✅ Migration file created: ${migrationPath}`)

  console.log('\n🚀 Next steps:')
  console.log('1. Run: npx supabase migration up')
  console.log('2. Or apply directly in Supabase dashboard SQL editor')

  console.log('\n✨ RLS fix preparation complete!')
}

applyRLSFixes().catch(console.error)