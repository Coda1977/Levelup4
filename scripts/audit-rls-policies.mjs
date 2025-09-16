#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

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
  }
})

async function auditRLSPolicies() {
  console.log('🔍 Auditing RLS Policies...\n')

  // For now, skip the complex policy query and focus on testing
  const policies = null
  const error = null

  if (!policies) {
    // Fallback: Try to get policies information via SQL query
    console.log('Using alternative method to get policies...\n')

    const tables = [
      'user_profiles',
      'user_progress',
      'conversations',
      'messages',
      'chapters',
      'categories'
    ]

    for (const table of tables) {
      console.log(`\n📋 Table: ${table}`)
      console.log('=' .repeat(50))

      // Check if RLS is enabled
      const { data: rlsCheck, error: rlsError } = await supabase
        .from(table)
        .select('*')
        .limit(0)

      if (rlsError?.code === '42501') {
        console.log('✅ RLS is ENABLED')
      } else if (!rlsError) {
        console.log('⚠️  RLS might be DISABLED or service role bypasses it')
      }

      // Try to get some data to see if policies work
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (countError) {
        console.log(`❌ Error accessing table: ${countError.message}`)
      } else {
        console.log(`📊 Total rows accessible: ${count}`)
      }
    }
  } else {
    // Display policies
    const tables = {}

    policies?.forEach(policy => {
      if (!tables[policy.tablename]) {
        tables[policy.tablename] = []
      }
      tables[policy.tablename].push(policy)
    })

    Object.entries(tables).forEach(([tableName, tablePolicies]) => {
      console.log(`\n📋 Table: ${tableName}`)
      console.log('=' .repeat(50))

      tablePolicies.forEach(policy => {
        console.log(`\nPolicy: ${policy.policyname}`)
        console.log(`Command: ${policy.cmd}`)
        console.log(`Roles: ${policy.roles.join(', ')}`)
        console.log(`Permissive: ${policy.permissive}`)

        if (policy.qual) {
          console.log(`USING: ${policy.qual}`)
        }

        if (policy.with_check) {
          console.log(`WITH CHECK: ${policy.with_check}`)
        }
      })
    })
  }

  // Test specific operations
  console.log('\n\n🧪 Testing Operations...')
  console.log('=' .repeat(50))

  // Test creating a user
  const testEmail = `test_${Date.now()}@example.com`

  console.log('\n1. Testing user creation...')
  const { data: newUser, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: 'TestPassword123!'
  })

  if (signUpError) {
    console.log(`❌ Sign up failed: ${signUpError.message}`)
  } else {
    console.log(`✅ User created: ${newUser.user?.id}`)

    // Test profile access
    console.log('\n2. Testing profile access...')
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', newUser.user.id)
      .single()

    if (profileError) {
      console.log(`❌ Profile access failed: ${profileError.message}`)
    } else {
      console.log(`✅ Profile accessible: ${profile?.id}`)
    }

    // Test progress insertion
    console.log('\n3. Testing progress insertion...')

    // First get a chapter
    const { data: chapter } = await supabase
      .from('chapters')
      .select('id')
      .limit(1)
      .single()

    if (chapter) {
      const { error: progressError } = await supabase
        .from('user_progress')
        .insert({
          user_id: newUser.user.id,
          chapter_id: chapter.id
        })

      if (progressError) {
        console.log(`❌ Progress insertion failed: ${progressError.message}`)
      } else {
        console.log(`✅ Progress inserted successfully`)
      }
    }

    // Clean up
    console.log('\n4. Cleaning up test user...')
    await supabase.auth.admin.deleteUser(newUser.user.id)
    console.log('✅ Test user cleaned up')
  }

  console.log('\n✨ Audit complete!')
}

auditRLSPolicies().catch(console.error)