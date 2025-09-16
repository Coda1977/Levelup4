#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import pg from 'pg'

// Load test environment
dotenv.config({ path: '.env.test' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (!projectRef) {
  console.error('Could not extract project ref from URL')
  process.exit(1)
}

// Construct direct database URL (common pattern for Supabase)
const databaseUrl = `postgres://postgres.${projectRef}:${serviceRoleKey}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`

async function applyRLSDirectly() {
  console.log('🔧 Applying RLS Policies Directly...\n')

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Since we can't directly execute raw SQL through the JS client,
  // we'll use individual operations that the client supports

  console.log('📝 Applying RLS fixes through Supabase operations...\n')

  try {
    // Test that we have service role access
    const { data: testData, error: testError } = await supabase
      .from('user_profiles')
      .select('count', { count: 'exact', head: true })

    if (testError) {
      console.error('❌ Failed to access database:', testError.message)
      return
    }

    console.log(`✅ Service role access confirmed (${testData} user profiles found)\n`)

    // Since we can't directly modify policies through JS client,
    // let's create a comprehensive test to verify what's working

    console.log('🧪 Testing current RLS state...\n')

    // Create a test user
    const testEmail = `test_rls_${Date.now()}@example.com`
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!'
    })

    if (authError) {
      console.error('❌ Failed to create test user:', authError.message)
      return
    }

    const testUserId = authData.user?.id
    console.log(`✅ Created test user: ${testUserId}\n`)

    // Create a user-scoped client to test RLS
    const userClient = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Sign in with the user client
    const { data: signInData, error: signInError } = await userClient.auth.signInWithPassword({
      email: testEmail,
      password: 'TestPassword123!'
    })

    if (signInError) {
      console.error('❌ Failed to sign in:', signInError.message)
    } else {
      console.log('✅ User signed in successfully\n')
    }

    // Test profile access
    console.log('Testing user_profiles access...')
    const { data: profileData, error: profileError } = await userClient
      .from('user_profiles')
      .select('*')
      .eq('id', testUserId)
      .single()

    if (profileError) {
      console.log(`❌ User cannot access own profile: ${profileError.message}`)
    } else {
      console.log(`✅ User can access own profile`)
    }

    // Test progress insertion
    console.log('Testing user_progress insertion...')
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id')
      .limit(1)
      .single()

    if (chapters) {
      const { error: progressError } = await userClient
        .from('user_progress')
        .insert({
          user_id: testUserId,
          chapter_id: chapters.id
        })

      if (progressError) {
        console.log(`❌ User cannot insert progress: ${progressError.message}`)
      } else {
        console.log(`✅ User can insert progress`)
      }
    }

    // Test conversation creation
    console.log('Testing conversations creation...')
    const { error: convError } = await userClient
      .from('conversations')
      .insert({
        user_id: testUserId,
        title: 'Test Conversation'
      })

    if (convError) {
      console.log(`❌ User cannot create conversation: ${convError.message}`)
    } else {
      console.log(`✅ User can create conversation`)
    }

    // Clean up
    console.log('\n🧹 Cleaning up test user...')
    await supabase.auth.admin.deleteUser(testUserId)
    console.log('✅ Test user deleted\n')

    console.log('📋 RLS Policy Status Summary:')
    console.log('================================')
    console.log('Since we cannot directly modify RLS policies via the JS client,')
    console.log('please apply the following SQL in your Supabase dashboard:\n')
    console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql')
    console.log('2. Open the SQL editor')
    console.log('3. Copy and paste the contents of: scripts/fix-rls-policies.sql')
    console.log('4. Click "Run" to apply the policies\n')

    console.log('Alternatively, you can use the Supabase CLI:')
    console.log('1. Install: npm install -g supabase')
    console.log('2. Login: supabase login')
    console.log('3. Link: supabase link --project-ref ' + projectRef)
    console.log('4. Push: supabase db push')

  } catch (error) {
    console.error('❌ Error during RLS testing:', error)
  }
}

applyRLSDirectly().catch(console.error)