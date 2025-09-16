const { createClient } = require('@supabase/supabase-js')

// Create fresh client
const supabase = createClient(
  'https://exxildftqhnlupxdlqfn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4eGlsZGZ0cWhubHVweGRscWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjA4MjgsImV4cCI6MjA3MzMzNjgyOH0.iBoiJPeUeEiI6WEkN6j6aLUtLaIHfy2-SlDLZC8f4fE'
)

async function testFresh() {
  console.log('🧪 Fresh test after RLS fix...\n')

  const testEmail = `fresh_${Date.now()}@example.com`
  const testPassword = 'Test123456!'

  try {
    // 1. Create user
    console.log('1. Creating new user...')
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    })

    if (signUpError) {
      console.error('❌ Sign up failed:', signUpError.message)
      return
    }

    console.log('✅ User created:', signUpData.user?.email)
    const userId = signUpData.user?.id

    // 2. Wait a moment for trigger
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 3. Check profile (this is where recursion error was happening)
    console.log('\n2. Checking user profile...')
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('❌ Profile error:', profileError.message)
      if (profileError.message.includes('recursion')) {
        console.error('⚠️  STILL HAVE RECURSION ERROR!')
      }
    } else {
      console.log('✅ Profile found! No recursion error!')
      console.log('   Profile data:', profile)
    }

    // 4. Test progress insert
    console.log('\n3. Testing progress insert...')
    const { error: progressError } = await supabase
      .from('user_progress')
      .insert({
        user_id: userId,
        chapter_id: 1
      })

    if (progressError) {
      console.error('❌ Progress error:', progressError.message)
      if (progressError.message.includes('recursion')) {
        console.error('⚠️  RECURSION ERROR IN PROGRESS!')
      }
    } else {
      console.log('✅ Progress insert successful!')
    }

    // 5. Clean up
    await supabase.from('user_progress').delete().eq('user_id', userId)
    await supabase.from('user_profiles').delete().eq('id', userId)

    console.log('\n✅ Test completed!')

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

testFresh()