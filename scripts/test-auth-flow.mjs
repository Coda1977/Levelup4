#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load test environment
dotenv.config({ path: '.env.test' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

async function testAuthFlow() {
  console.log('🧪 Testing Authentication Flow...\n')

  // Admin client
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // User client
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const testEmail = `test_${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'

  try {
    // Step 1: Sign up with admin client
    console.log('1. Signing up user with admin client...')
    const { data: signUpData, error: signUpError } = await adminClient.auth.signUp({
      email: testEmail,
      password: testPassword
    })

    if (signUpError) {
      console.error('❌ Sign up failed:', signUpError.message)
      return
    }

    console.log(`✅ User created: ${signUpData.user?.id}`)
    console.log(`   Email confirmed: ${signUpData.user?.email_confirmed_at ? 'Yes' : 'No'}`)
    console.log(`   Confirmation sent: ${signUpData.user?.confirmation_sent_at ? 'Yes' : 'No'}`)

    // Step 2: Try to sign in immediately with user client
    console.log('\n2. Attempting sign in with user client...')
    const { data: signInData, error: signInError } = await userClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })

    if (signInError) {
      console.log(`⚠️  Sign in failed: ${signInError.message}`)

      // Step 3: Confirm email using admin (simulate email confirmation)
      console.log('\n3. Confirming email with admin privileges...')
      const { data: confirmData, error: confirmError } = await adminClient.auth.admin.updateUserById(
        signUpData.user.id,
        {
          email_confirmed_at: new Date().toISOString()
        }
      )

      if (confirmError) {
        console.error('❌ Email confirmation failed:', confirmError.message)
      } else {
        console.log('✅ Email confirmed')

        // Step 4: Try sign in again
        console.log('\n4. Attempting sign in after confirmation...')
        const { data: retrySignIn, error: retryError } = await userClient.auth.signInWithPassword({
          email: testEmail,
          password: testPassword
        })

        if (retryError) {
          console.error('❌ Sign in still failed:', retryError.message)
        } else {
          console.log('✅ Sign in successful!')
          console.log(`   Session token: ${retrySignIn.session?.access_token ? 'Present' : 'Missing'}`)
        }
      }
    } else {
      console.log('✅ Sign in successful without confirmation!')
      console.log(`   Session token: ${signInData.session?.access_token ? 'Present' : 'Missing'}`)
    }

    // Step 5: Test profile access
    console.log('\n5. Testing profile access...')
    const { data: profile, error: profileError } = await adminClient
      .from('user_profiles')
      .select('*')
      .eq('id', signUpData.user.id)
      .single()

    if (profileError) {
      console.log(`⚠️  Profile not found: ${profileError.message}`)
    } else {
      console.log(`✅ Profile exists: ${profile.id}`)
    }

    // Cleanup
    console.log('\n6. Cleaning up test user...')
    await adminClient.auth.admin.deleteUser(signUpData.user.id)
    console.log('✅ Test user deleted')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }

  console.log('\n✨ Auth flow test complete!')
}

testAuthFlow().catch(console.error)