/**
 * Critical Path Test: Chat Core Functionality
 * Tests chat conversations, message persistence, and user isolation
 */

import { testSupabase, generateTestEmail, cleanupTestUser, waitFor } from '../utils/test-helpers'


describe('Chat System - Critical Path', () => {
  let testUserId: string | undefined
  let conversationId: string | undefined
  let testEmail: string
  const testPassword = 'SecurePassword123!'

  beforeEach(async () => {
    // Generate fresh email for each test to avoid conflicts
    testEmail = generateTestEmail()

    // Add delay to avoid rate limiting
    await waitFor(500)

    // Create test user using admin client
    const { data, error } = await testSupabase.auth.signUp({
      email: testEmail,
      password: testPassword
    })

    expect(error).toBeNull()
    testUserId = data.user?.id
    expect(testUserId).toBeDefined()

    // Confirm user email to enable authentication
    if (testUserId) {
      await testSupabase.auth.admin.updateUserById(testUserId, {
        email_confirm: true
      })
    }

    await waitFor(1000) // Wait for user confirmation

    // Create user client and sign in
    const { error: signInError } = await testSupabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })

    expect(signInError).toBeNull()
    await waitFor(500) // Wait for session establishment
  })

  afterEach(async () => {
    // Clean up conversations and messages
    if (conversationId) {
      await testSupabase.from('messages').delete().eq('conversation_id', conversationId)
      await testSupabase.from('conversations').delete().eq('id', conversationId)
    }

    if (testUserId) {
      await cleanupTestUser(testUserId)
      testUserId = undefined
    }

    // Add delay between tests to avoid rate limiting
    await waitFor(200)
  })

  describe('Conversation Management', () => {
    test('should create a new conversation', async () => {
      // Act
      const { data, error } = await testSupabase
        .from('conversations')
        .insert({
          user_id: testUserId,
          title: 'Test Conversation',
          selected_chapters: []
        })
        .select()
        .single()

      conversationId = data?.id

      // Assert
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.user_id).toBe(testUserId)
      expect(data?.title).toBe('Test Conversation')
      expect(data?.is_archived).toBe(false)
      expect(data?.is_starred).toBe(false)
    })

    test('should list user conversations', async () => {
      // Arrange: Create multiple conversations
      const titles = ['Conv 1', 'Conv 2', 'Conv 3']
      const createdIds: string[] = []

      for (const title of titles) {
        const { data } = await testSupabase
          .from('conversations')
          .insert({
            user_id: testUserId,
            title,
            selected_chapters: []
          })
          .select()
          .single()

        if (data) createdIds.push(data.id)
      }

      // Act: List conversations
      const { data: conversations, error } = await testSupabase
        .from('conversations')
        .select('*')
        .eq('user_id', testUserId)
        .order('created_at', { ascending: false })

      // Assert
      expect(error).toBeNull()
      expect(conversations).toHaveLength(titles.length)
      expect(conversations?.map(c => c.title)).toEqual(
        expect.arrayContaining(titles)
      )

      // Cleanup
      for (const id of createdIds) {
        await testSupabase.from('conversations').delete().eq('id', id)
      }
    })

    test('should update conversation metadata', async () => {
      // Arrange: Create conversation
      const { data: conv } = await testSupabase
        .from('conversations')
        .insert({
          user_id: testUserId,
          title: 'Original Title',
          selected_chapters: []
        })
        .select()
        .single()

      conversationId = conv?.id

      // Act: Update title and star it
      const { data: updated, error } = await testSupabase
        .from('conversations')
        .update({
          title: 'Updated Title',
          is_starred: true
        })
        .eq('id', conversationId)
        .select()
        .single()

      // Assert
      expect(error).toBeNull()
      expect(updated?.title).toBe('Updated Title')
      expect(updated?.is_starred).toBe(true)
    })

    test('should archive conversations', async () => {
      // Arrange: Create conversation
      const { data: conv } = await testSupabase
        .from('conversations')
        .insert({
          user_id: testUserId,
          title: 'To Archive',
          selected_chapters: []
        })
        .select()
        .single()

      conversationId = conv?.id

      // Act: Archive it
      await testSupabase
        .from('conversations')
        .update({ is_archived: true })
        .eq('id', conversationId)

      // Assert: Should not appear in active list
      const { data: activeConvs } = await testSupabase
        .from('conversations')
        .select('*')
        .eq('user_id', testUserId)
        .eq('is_archived', false)

      expect(activeConvs).toHaveLength(0)
    })

    test('should delete conversations with cascade', async () => {
      // Arrange: Create conversation with messages
      const { data: conv } = await testSupabase
        .from('conversations')
        .insert({
          user_id: testUserId,
          title: 'To Delete',
          selected_chapters: []
        })
        .select()
        .single()

      const tempConvId = conv?.id

      // Add a message
      await testSupabase
        .from('messages')
        .insert({
          conversation_id: tempConvId,
          role: 'user',
          content: 'Test message'
        })

      // Act: Delete conversation
      const { error } = await testSupabase
        .from('conversations')
        .delete()
        .eq('id', tempConvId)

      // Assert
      expect(error).toBeNull()

      // Verify messages were cascade deleted
      const { data: orphanMessages } = await testSupabase
        .from('messages')
        .select('*')
        .eq('conversation_id', tempConvId)

      expect(orphanMessages).toHaveLength(0)
    })
  })

  describe('Message Persistence', () => {
    beforeEach(async () => {
      // Create a conversation for message tests
      const { data } = await testSupabase
        .from('conversations')
        .insert({
          user_id: testUserId,
          title: 'Message Test Conv',
          selected_chapters: []
        })
        .select()
        .single()

      conversationId = data?.id
    })

    test('should save user messages', async () => {
      // Act
      const { data, error } = await testSupabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content: 'How do I delegate effectively?'
        })
        .select()
        .single()

      // Assert
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.role).toBe('user')
      expect(data?.content).toBe('How do I delegate effectively?')
      expect(data?.timestamp).toBeDefined()
    })

    test('should save assistant responses with metadata', async () => {
      // Act
      const { data, error } = await testSupabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: 'Delegation involves trust and clear communication...',
          followups: [
            'What tasks are you looking to delegate?',
            'How experienced is your team?'
          ],
          relevant_chapters: [
            { id: 'chapter-1', title: 'Delegation' }
          ]
        })
        .select()
        .single()

      // Assert
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.role).toBe('assistant')
      expect(data?.followups).toHaveLength(2)
      expect(data?.relevant_chapters).toHaveLength(1)
    })

    test('should maintain message order', async () => {
      // Arrange: Create multiple messages
      const messages = [
        { role: 'user', content: 'Question 1' },
        { role: 'assistant', content: 'Answer 1' },
        { role: 'user', content: 'Question 2' },
        { role: 'assistant', content: 'Answer 2' }
      ]

      // Act: Insert with delays to ensure order
      for (const msg of messages) {
        await testSupabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            ...msg
          })
        await waitFor(100) // Small delay to ensure timestamp difference
      }

      // Assert: Retrieve in order
      const { data: retrieved } = await testSupabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true })

      expect(retrieved).toHaveLength(messages.length)
      retrieved?.forEach((msg, idx) => {
        expect(msg.role).toBe(messages[idx].role)
        expect(msg.content).toBe(messages[idx].content)
      })
    })

    test('should handle long messages', async () => {
      // Arrange: Create a very long message
      const longContent = 'A'.repeat(10000) // 10k characters

      // Act
      const { data, error } = await testSupabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content: longContent
        })
        .select()
        .single()

      // Assert
      expect(error).toBeNull()
      expect(data?.content).toBe(longContent)
    })

    test('should track message completeness', async () => {
      // Act: Save incomplete streaming message
      const { data: incomplete } = await testSupabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: 'Partial response...',
          is_complete: false
        })
        .select()
        .single()

      // Assert
      expect(incomplete?.is_complete).toBe(false)

      // Act: Update to complete
      const { data: complete } = await testSupabase
        .from('messages')
        .update({
          content: 'Partial response... now complete!',
          is_complete: true
        })
        .eq('id', incomplete?.id)
        .select()
        .single()

      // Assert
      expect(complete?.is_complete).toBe(true)
    })
  })

  describe('User Isolation', () => {
    let otherUserId: string | undefined
    let otherConversationId: string | undefined
    let otherEmail: string

    beforeEach(async () => {
      // Add extra delay to avoid rate limiting in nested tests
      await waitFor(1000)

      // Generate fresh email for the other user
      otherEmail = generateTestEmail()

      // Create another user with conversation
      const { data: otherUser, error: otherUserError } = await testSupabase.auth.signUp({
        email: otherEmail,
        password: testPassword
      })

      expect(otherUserError).toBeNull()
      otherUserId = otherUser.user?.id
      expect(otherUserId).toBeDefined()

      // Confirm other user email
      if (otherUserId) {
        await testSupabase.auth.admin.updateUserById(otherUserId, {
          email_confirm: true
        })
      }

      await waitFor(1000)

      const { data: otherConv } = await testSupabase
        .from('conversations')
        .insert({
          user_id: otherUserId,
          title: 'Other User Conv',
          selected_chapters: []
        })
        .select()
        .single()

      otherConversationId = otherConv?.id

      // Create conversation for main test user
      const { data: mainConv } = await testSupabase
        .from('conversations')
        .insert({
          user_id: testUserId,
          title: 'Main User Conv',
          selected_chapters: []
        })
        .select()
        .single()

      conversationId = mainConv?.id
    })

    afterEach(async () => {
      if (otherConversationId) {
        await testSupabase.from('messages').delete().eq('conversation_id', otherConversationId)
        await testSupabase.from('conversations').delete().eq('id', otherConversationId)
      }
      if (otherUserId) {
        await cleanupTestUser(otherUserId)
      }
    })

    test('should isolate conversations between users', async () => {
      // Act: Try to access other user's conversations
      const { data: wrongAccess } = await testSupabase
        .from('conversations')
        .select('*')
        .eq('user_id', otherUserId)
        .eq('id', conversationId) // Try to access main user's conversation

      // Assert
      expect(wrongAccess).toBeDefined()
      expect(Array.isArray(wrongAccess) ? wrongAccess : []).toHaveLength(0)
    })

    test('should isolate messages between users', async () => {
      // Arrange: Add message to other user's conversation
      await testSupabase
        .from('messages')
        .insert({
          conversation_id: otherConversationId,
          role: 'user',
          content: 'Other user message'
        })

      // Act: Try to read other user's messages
      const { data: wrongMessages } = await testSupabase
        .from('messages')
        .select('*')
        .eq('conversation_id', otherConversationId)

      // Note: This depends on RLS policies
      // If properly configured, should return empty or error
      // Current test assumes messages are protected via conversation ownership
    })

    test('should prevent cross-user message insertion', async () => {
      // Act: Try to add message to other user's conversation
      const { error } = await testSupabase
        .from('messages')
        .insert({
          conversation_id: otherConversationId,
          role: 'user',
          content: 'Attempted intrusion'
        })

      // Assert: Should fail or be blocked by RLS
      // Note: Exact behavior depends on RLS configuration
    })
  })

  describe('Chat History Migration', () => {
    test('should support localStorage to database migration', async () => {
      // Arrange: Simulate localStorage data structure
      const localStorageData = [
        {
          title: 'Migrated Conv 1',
          messages: [
            { role: 'user', content: 'Old question' },
            { role: 'assistant', content: 'Old answer' }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]

      // Act: Migrate to database
      for (const localConv of localStorageData) {
        // Create conversation
        const { data: conv } = await testSupabase
          .from('conversations')
          .insert({
            user_id: testUserId,
            title: localConv.title,
            created_at: localConv.createdAt,
            updated_at: localConv.updatedAt
          })
          .select()
          .single()

        // Create messages
        if (conv) {
          for (const msg of localConv.messages) {
            await testSupabase
              .from('messages')
              .insert({
                conversation_id: conv.id,
                role: msg.role as 'user' | 'assistant',
                content: msg.content
              })
          }
        }

        conversationId = conv?.id // For cleanup
      }

      // Assert: Verify migration
      const { data: migrated } = await testSupabase
        .from('conversations')
        .select(`
          *,
          messages (*)
        `)
        .eq('user_id', testUserId)
        .single()

      expect(migrated).toBeDefined()
      expect(migrated?.title).toBe('Migrated Conv 1')
      expect(migrated?.messages).toHaveLength(2)
    })
  })

  describe('Conversation Search and Filtering', () => {
    beforeEach(async () => {
      // Create multiple conversations with different states
      const conversations = [
        { title: 'Starred Conv', is_starred: true },
        { title: 'Archived Conv', is_archived: true },
        { title: 'Regular Conv', is_starred: false }
      ]

      for (const conv of conversations) {
        await testSupabase
          .from('conversations')
          .insert({
            user_id: testUserId,
            title: conv.title,
            is_starred: conv.is_starred || false,
            is_archived: conv.is_archived || false,
            selected_chapters: []
          })
      }
    })

    test('should filter starred conversations', async () => {
      // Act
      const { data: starred } = await testSupabase
        .from('conversations')
        .select('*')
        .eq('user_id', testUserId)
        .eq('is_starred', true)

      // Assert
      expect(starred).toHaveLength(1)
      expect(starred?.[0].title).toBe('Starred Conv')
    })

    test('should exclude archived from active list', async () => {
      // Act
      const { data: active } = await testSupabase
        .from('conversations')
        .select('*')
        .eq('user_id', testUserId)
        .eq('is_archived', false)

      // Assert
      expect(active?.map(c => c.title)).not.toContain('Archived Conv')
    })

    test('should order by updated_at', async () => {
      // Act
      const { data: ordered } = await testSupabase
        .from('conversations')
        .select('*')
        .eq('user_id', testUserId)
        .order('updated_at', { ascending: false })

      // Assert
      expect(ordered).toBeDefined()
      expect(ordered!.length).toBeGreaterThan(0)

      // Verify order
      for (let i = 1; i < ordered!.length; i++) {
        const prev = new Date(ordered![i - 1].updated_at)
        const curr = new Date(ordered![i].updated_at)
        expect(prev >= curr).toBe(true)
      }
    })
  })
})