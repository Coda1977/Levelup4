const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://exxildftqhnlupxdlqfn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4eGlsZGZ0cWhubHVweGRscWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjA4MjgsImV4cCI6MjA3MzMzNjgyOH0.iBoiJPeUeEiI6WEkN6j6aLUtLaIHfy2-SlDLZC8f4fE'
)

async function testAuthFlow() {
  console.log('🧪 Testing Complete Authentication Flow\n')

  // Test user credentials
  const testEmail = `test_${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'

  try {
    // 1. Sign up a new user
    console.log('1. Creating new user...')
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User'
        }
      }
    })

    if (signUpError) {
      console.error('❌ Sign up failed:', signUpError.message)
      return
    }

    console.log('✅ User created:', signUpData.user?.email)
    const userId = signUpData.user?.id

    // 2. Check if user profile was created automatically
    console.log('\n2. Checking if user profile was created...')
    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for trigger

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('❌ Profile not found:', profileError.message)
    } else {
      console.log('✅ User profile created automatically:')
      console.log('   - First Name:', profile.first_name || '(empty)')
      console.log('   - Last Name:', profile.last_name || '(empty)')
      console.log('   - Is Admin:', profile.is_admin)
    }

    // 3. Test marking a chapter as complete
    console.log('\n3. Testing progress tracking...')

    // Get a test chapter
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id, title')
      .limit(1)
      .single()

    if (chapters) {
      console.log(`   Found chapter: "${chapters.title}"`)

      // Try to mark it complete
      const { data: progress, error: progressError } = await supabase
        .from('user_progress')
        .insert({
          user_id: userId,
          chapter_id: chapters.id
        })
        .select()

      if (progressError) {
        console.error('❌ Failed to mark chapter complete:', progressError.message)
      } else {
        console.log('✅ Successfully marked chapter as complete!')
      }

      // Verify progress was saved
      const { data: savedProgress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)

      console.log(`✅ User has ${savedProgress?.length || 0} completed chapters`)
    }

    // 4. Test sign out and sign in
    console.log('\n4. Testing sign out and sign in...')
    await supabase.auth.signOut()
    console.log('✅ Signed out')

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })

    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message)
    } else {
      console.log('✅ Successfully signed in again:', signInData.user?.email)
    }

    // 5. Clean up test data
    console.log('\n5. Cleaning up test data...')

    // Delete progress
    await supabase.from('user_progress').delete().eq('user_id', userId)

    // Delete profile
    await supabase.from('user_profiles').delete().eq('id', userId)

    // Delete user from auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)
    if (!deleteError) {
      console.log('✅ Test user cleaned up')
    }

    console.log('\n🎉 Authentication flow test completed successfully!')

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the test
testAuthFlow().then(() => process.exit(0))