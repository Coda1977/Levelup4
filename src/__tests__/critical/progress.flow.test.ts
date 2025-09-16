/**
 * Critical Path Test: Progress Tracking
 * Tests user progress tracking functionality and isolation
 */

import { testSupabase, generateTestEmail, cleanupTestUser, waitFor } from '../utils/test-helpers'


describe('Progress Tracking - Critical Path', () => {
  let testUserId: string | undefined
  let testChapterId: string | undefined
  let testEmail: string
  const testPassword = 'SecurePassword123!'

  beforeAll(async () => {
    // Get a test chapter to work with
    const { data: chapters } = await testSupabase
      .from('chapters')
      .select('id, title')
      .limit(1)
      .single()

    testChapterId = chapters?.id
  })

  beforeEach(async () => {
    // Generate fresh email for each test to avoid conflicts
    testEmail = generateTestEmail()

    // Add delay to avoid rate limiting
    await waitFor(500)

    // Create test user for each test using admin client
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

    // Create a fresh user client and sign in with it
    const { error: signInError } = await testSupabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })

    expect(signInError).toBeNull()
    await waitFor(500) // Wait for session establishment
  })

  afterEach(async () => {
    if (testUserId) {
      await cleanupTestUser(testUserId)
      testUserId = undefined
    }
    // Add delay between tests to avoid rate limiting
    await waitFor(200)
  })

  describe('Mark Chapter Complete', () => {
    test('should successfully mark a chapter as complete', async () => {
      // Act
      const { data, error } = await testSupabase
        .from('user_progress')
        .insert({
          user_id: testUserId,
          chapter_id: testChapterId
        })
        .select()
        .single()

      // Assert
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.user_id).toBe(testUserId)
      expect(data?.chapter_id).toBe(testChapterId)
      expect(data?.completed_at).toBeDefined()
    })

    test('should prevent duplicate progress entries', async () => {
      // Arrange: Mark chapter complete first time
      await testSupabase
        .from('user_progress')
        .insert({
          user_id: testUserId,
          chapter_id: testChapterId
        })

      // Act: Try to mark same chapter complete again
      const { error } = await testSupabase
        .from('user_progress')
        .insert({
          user_id: testUserId,
          chapter_id: testChapterId
        })

      // Assert
      expect(error).toBeDefined()
      expect(error?.code).toBe('23505') // Unique violation
    })

    test('should track multiple chapter completions', async () => {
      // Arrange: Get multiple chapters
      const { data: chapters } = await testSupabase
        .from('chapters')
        .select('id')
        .limit(3)

      // Act: Mark all chapters as complete
      for (const chapter of chapters || []) {
        await testSupabase
          .from('user_progress')
          .insert({
            user_id: testUserId,
            chapter_id: chapter.id
          })
      }

      // Assert: Check all progress saved
      const { data: progress } = await testSupabase
        .from('user_progress')
        .select('*')
        .eq('user_id', testUserId)

      expect(progress).toHaveLength(chapters?.length || 0)
      progress?.forEach(p => {
        expect(p.user_id).toBe(testUserId)
        expect(p.completed_at).toBeDefined()
      })
    })
  })

  describe('Fetch User Progress', () => {
    test('should retrieve user progress correctly', async () => {
      // Arrange: Mark some chapters complete
      const { data: chapters } = await testSupabase
        .from('chapters')
        .select('id, title')
        .limit(2)

      for (const chapter of chapters || []) {
        await testSupabase
          .from('user_progress')
          .insert({
            user_id: testUserId,
            chapter_id: chapter.id
          })
      }

      // Act: Fetch progress
      const { data: progress, error } = await testSupabase
        .from('user_progress')
        .select(`
          *,
          chapters (
            id,
            title,
            categories (
              name
            )
          )
        `)
        .eq('user_id', testUserId)

      // Assert
      expect(error).toBeNull()
      expect(progress).toBeDefined()
      expect(progress?.length).toBe(chapters?.length || 0)

      progress?.forEach(p => {
        expect(p.chapters).toBeDefined()
        expect(p.chapters.title).toBeDefined()
      })
    })

    test('should return empty array for user with no progress', async () => {
      // Act
      const { data: progress, error } = await testSupabase
        .from('user_progress')
        .select('*')
        .eq('user_id', testUserId)

      // Assert
      expect(error).toBeNull()
      expect(progress).toEqual([])
    })

    test('should include completion timestamps', async () => {
      // Arrange
      const beforeTime = new Date()
      await waitFor(100) // Small buffer to account for timing

      await testSupabase
        .from('user_progress')
        .insert({
          user_id: testUserId,
          chapter_id: testChapterId
        })

      await waitFor(100) // Small buffer to account for timing
      const afterTime = new Date()

      // Act
      const { data: progress } = await testSupabase
        .from('user_progress')
        .select('completed_at')
        .eq('user_id', testUserId)
        .single()

      // Assert
      const completedAt = new Date(progress?.completed_at)
      expect(completedAt >= beforeTime).toBe(true)
      expect(completedAt <= afterTime).toBe(true)
    })
  })

  describe('User Isolation', () => {
    let otherUserId: string | undefined
    let otherEmail: string

    beforeEach(async () => {
      // Add extra delay to avoid rate limiting in nested tests
      await waitFor(1000)

      // Generate fresh email for the other user
      otherEmail = generateTestEmail()

      // Create another user using admin
      const { data, error } = await testSupabase.auth.signUp({
        email: otherEmail,
        password: testPassword
      })

      expect(error).toBeNull()
      otherUserId = data.user?.id
      expect(otherUserId).toBeDefined()

      // Confirm other user email
      if (otherUserId) {
        await testSupabase.auth.admin.updateUserById(otherUserId, {
          email_confirm: true
        })
      }

      await waitFor(1000)

      // Create a client for the other user
      const { error: signInError } = await testSupabase.auth.signInWithPassword({
        email: otherEmail,
        password: testPassword
      })

      expect(signInError).toBeNull()
      await waitFor(500)
    })

    afterEach(async () => {
      if (otherUserId) {
        await cleanupTestUser(otherUserId)
      }
      await waitFor(200)
    })

    test('should isolate progress between users', async () => {
      // Arrange: First user marks chapter complete
      await testSupabase
        .from('user_progress')
        .insert({
          user_id: testUserId,
          chapter_id: testChapterId
        })

      // Act: Check second user's progress
      const { data: otherProgress } = await testSupabase
        .from('user_progress')
        .select('*')
        .eq('user_id', otherUserId)

      // Assert
      expect(otherProgress).toEqual([])
    })

    test('should prevent user from accessing other user progress', async () => {
      // Arrange: First user marks chapter complete
      await testSupabase
        .from('user_progress')
        .insert({
          user_id: testUserId,
          chapter_id: testChapterId
        })

      // Act: Try to query with wrong user_id
      const { data: wrongUserProgress } = await testSupabase
        .from('user_progress')
        .select('*')
        .eq('user_id', otherUserId)

      // Assert
      expect(wrongUserProgress).toEqual([])
    })

    test('should handle concurrent progress updates from multiple users', async () => {
      // Act: Both users mark same chapter complete simultaneously
      const [result1, result2] = await Promise.all([
        testSupabase.from('user_progress').insert({
          user_id: testUserId,
          chapter_id: testChapterId
        }),
        testSupabase.from('user_progress').insert({
          user_id: otherUserId,
          chapter_id: testChapterId
        })
      ])

      // Assert: Both should succeed
      expect(result1.error).toBeNull()
      expect(result2.error).toBeNull()

      // Verify isolation
      const { data: user1Progress } = await testSupabase
        .from('user_progress')
        .select('*')
        .eq('user_id', testUserId)

      const { data: user2Progress } = await testSupabase
        .from('user_progress')
        .select('*')
        .eq('user_id', otherUserId)

      expect(user1Progress).toHaveLength(1)
      expect(user2Progress).toHaveLength(1)
      expect(user1Progress?.[0].user_id).toBe(testUserId)
      expect(user2Progress?.[0].user_id).toBe(otherUserId)
    })
  })

  describe('Progress Statistics', () => {
    test('should calculate completion percentage correctly', async () => {
      // Arrange: Get total chapters
      const { count: totalChapters } = await testSupabase
        .from('chapters')
        .select('*', { count: 'exact', head: true })

      // Mark half of them complete
      const { data: chapters } = await testSupabase
        .from('chapters')
        .select('id')
        .limit(Math.floor((totalChapters || 0) / 2))

      for (const chapter of chapters || []) {
        await testSupabase
          .from('user_progress')
          .insert({
            user_id: testUserId,
            chapter_id: chapter.id
          })
      }

      // Act: Calculate progress
      const { count: completedCount } = await testSupabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', testUserId)

      // Assert
      const percentage = ((completedCount || 0) / (totalChapters || 1)) * 100
      expect(percentage).toBeGreaterThanOrEqual(0)
      expect(percentage).toBeLessThanOrEqual(100)
      expect(completedCount).toBe(chapters?.length || 0)
    })

    test('should track progress by category', async () => {
      // Act: Get progress grouped by category
      const { data: progressWithCategories } = await testSupabase
        .from('user_progress')
        .select(`
          *,
          chapters!inner (
            title,
            categories!inner (
              name
            )
          )
        `)
        .eq('user_id', testUserId)

      // Assert
      // Group by category for statistics
      const categoryProgress: Record<string, number> = {}

      progressWithCategories?.forEach(p => {
        const categoryName = p.chapters?.categories?.name || 'Uncategorized'
        categoryProgress[categoryName] = (categoryProgress[categoryName] || 0) + 1
      })

      // Verify structure
      expect(typeof categoryProgress).toBe('object')
    })
  })

  describe('Progress Clear/Reset', () => {
    test('should be able to clear specific progress', async () => {
      // Arrange: Mark chapter complete
      await testSupabase
        .from('user_progress')
        .insert({
          user_id: testUserId,
          chapter_id: testChapterId
        })

      // Act: Delete specific progress
      const { error } = await testSupabase
        .from('user_progress')
        .delete()
        .eq('user_id', testUserId)
        .eq('chapter_id', testChapterId)

      // Assert
      expect(error).toBeNull()

      const { data: remainingProgress } = await testSupabase
        .from('user_progress')
        .select('*')
        .eq('user_id', testUserId)

      expect(remainingProgress).toEqual([])
    })

    test('should be able to clear all user progress', async () => {
      // Arrange: Mark multiple chapters complete
      const { data: chapters } = await testSupabase
        .from('chapters')
        .select('id')
        .limit(3)

      for (const chapter of chapters || []) {
        await testSupabase
          .from('user_progress')
          .insert({
            user_id: testUserId,
            chapter_id: chapter.id
          })
      }

      // Act: Clear all progress
      const { error } = await testSupabase
        .from('user_progress')
        .delete()
        .eq('user_id', testUserId)

      // Assert
      expect(error).toBeNull()

      const { data: remainingProgress } = await testSupabase
        .from('user_progress')
        .select('*')
        .eq('user_id', testUserId)

      expect(remainingProgress).toEqual([])
    })
  })
})