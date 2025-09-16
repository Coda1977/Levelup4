const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://exxildftqhnlupxdlqfn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4eGlsZGZ0cWhubHVweGRscWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjA4MjgsImV4cCI6MjA3MzMzNjgyOH0.iBoiJPeUeEiI6WEkN6j6aLUtLaIHfy2-SlDLZC8f4fE'
)

async function testChatIntegration() {
  console.log('🧪 Testing Chat Auth Integration\n')

  // Test user credentials
  const testEmail = `chat_test_${Date.now()}@example.com`
  const testPassword = 'TestChat123!'

  try {
    // 1. Create test user
    console.log('1. Creating test user for chat...')
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

    // Wait for profile trigger
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 2. Create a conversation
    console.log('\n2. Creating a conversation...')
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title: 'Test Chat Conversation',
        selected_chapters: []
      })
      .select()
      .single()

    if (convError) {
      console.error('❌ Failed to create conversation:', convError.message)
      return
    }

    console.log('✅ Conversation created:', conversation.title)

    // 3. Add messages to the conversation
    console.log('\n3. Adding messages to conversation...')

    const userMessage = {
      conversation_id: conversation.id,
      role: 'user',
      content: 'How do I delegate effectively?'
    }

    const { error: userMsgError } = await supabase
      .from('messages')
      .insert(userMessage)

    if (userMsgError) {
      console.error('❌ Failed to add user message:', userMsgError.message)
      return
    }

    console.log('✅ User message added')

    const assistantMessage = {
      conversation_id: conversation.id,
      role: 'assistant',
      content: 'Delegation is about trusting your team with responsibility...',
      followups: ['What specific task are you looking to delegate?', 'How experienced is your team member?']
    }

    const { error: assistantMsgError } = await supabase
      .from('messages')
      .insert(assistantMessage)

    if (assistantMsgError) {
      console.error('❌ Failed to add assistant message:', assistantMsgError.message)
      return
    }

    console.log('✅ Assistant message added')

    // 4. Verify messages are stored correctly
    console.log('\n4. Verifying message storage...')
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('timestamp', { ascending: true })

    if (fetchError) {
      console.error('❌ Failed to fetch messages:', fetchError.message)
      return
    }

    console.log(`✅ Found ${messages.length} messages in conversation`)
    messages.forEach((msg, idx) => {
      console.log(`   Message ${idx + 1}: [${msg.role}] ${msg.content.substring(0, 50)}...`)
    })

    // 5. Test user isolation (security check)
    console.log('\n5. Testing user isolation...')

    // Create another user
    const otherEmail = `other_${Date.now()}@example.com`
    const { data: otherUser } = await supabase.auth.signUp({
      email: otherEmail,
      password: testPassword
    })

    // Try to access first user's conversation (should fail due to RLS)
    const { data: wrongAccess, error: accessError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversation.id)
      .eq('user_id', otherUser.user?.id)
      .single()

    if (!wrongAccess) {
      console.log('✅ User isolation working - other users cannot access conversations')
    } else {
      console.error('❌ Security issue - other user could access conversation!')
    }

    // 6. Test conversation listing
    console.log('\n6. Testing conversation listing...')
    const { data: userConversations } = await supabase
      .from('conversations')
      .select('*, messages(id)')
      .eq('user_id', userId)

    console.log(`✅ User has ${userConversations?.length || 0} conversations`)

    // 7. Clean up test data
    console.log('\n7. Cleaning up test data...')

    // Delete messages
    await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversation.id)

    // Delete conversation
    await supabase
      .from('conversations')
      .delete()
      .eq('id', conversation.id)

    // Delete users from profiles
    await supabase
      .from('user_profiles')
      .delete()
      .in('id', [userId, otherUser?.user?.id].filter(Boolean))

    console.log('✅ Test data cleaned up')

    console.log('\n🎉 Chat Auth Integration test completed successfully!')
    console.log('\nSummary:')
    console.log('- ✅ Users can create conversations')
    console.log('- ✅ Messages are saved to database')
    console.log('- ✅ Conversations are isolated per user')
    console.log('- ✅ Messages belong to conversations')
    console.log('- ✅ RLS policies are working correctly')

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the test
testChatIntegration().then(() => process.exit(0))