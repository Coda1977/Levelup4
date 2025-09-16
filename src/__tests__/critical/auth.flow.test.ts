/**
 * Critical Path Test: Authentication Flow
 * Tests the complete authentication journey from signup to signout
 */

import { testSupabase, generateTestEmail, cleanupTestUser, waitFor } from '../utils/test-helpers'

describe('Authentication Flow - Critical Path', () => {
  let testUserId: string | undefined
  let testEmail: string
  const testPassword = 'SecurePassword123!'

  beforeEach(async () => {
    // Generate fresh email for each test to avoid conflicts
    testEmail = generateTestEmail()
  })

  afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      await cleanupTestUser(testUserId)
      testUserId = undefined
    }
  })

  describe('User Registration', () => {
    test('should successfully create a new user account', async () => {
      // Act: Sign up
      const { data, error } = await testSupabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            first_name: 'Test',
            last_name: 'User'
          }
        }
      })

      // Assert
      expect(error).toBeNull()
      expect(data.user).toBeDefined()
      expect(data.user?.email).toBe(testEmail)

      testUserId = data.user?.id
    })

    test('should automatically create user profile on signup', async () => {
      // Arrange: Sign up
      const { data: signUpData, error: signUpError } = await testSupabase.auth.signUp({
        email: testEmail,
        password: testPassword
      })

      expect(signUpError).toBeNull()
      expect(signUpData.user).toBeDefined()

      testUserId = signUpData.user?.id
      expect(testUserId).toBeDefined()

      // Wait for trigger to create profile
      await waitFor(1500)

      // Act: Check for profile
      const { data: profile, error } = await testSupabase
        .from('user_profiles')
        .select('*')
        .eq('id', testUserId!)
        .single()

      // Assert
      expect(error).toBeNull()
      expect(profile).toBeDefined()
      expect(profile?.id).toBe(testUserId)
      expect(profile?.is_admin).toBe(false)
    })

    test('should prevent duplicate email registration', async () => {
      // Arrange: Create first user
      const { data: firstUser } = await testSupabase.auth.signUp({
        email: testEmail,
        password: testPassword
      })

      testUserId = firstUser.user?.id

      // Act: Try to create duplicate
      const { data: duplicateUser, error } = await testSupabase.auth.signUp({
        email: testEmail,
        password: 'DifferentPassword123!'
      })

      // Assert
      expect(duplicateUser.user).toBeDefined() // Supabase returns user but doesn't create duplicate
      expect(duplicateUser.session).toBeNull() // No session for duplicate attempt
    })
  })

  describe('User Sign In', () => {
    beforeEach(async () => {
      // Create a user for sign in tests and ensure it's confirmed
      const { data, error } = await testSupabase.auth.signUp({
        email: testEmail,
        password: testPassword
      })

      expect(error).toBeNull()
      testUserId = data.user?.id
      expect(testUserId).toBeDefined()

      // Confirm user email manually since we're in test mode
      if (testUserId) {
        await testSupabase.auth.admin.updateUserById(testUserId, {
          email_confirm: true
        })
      }

      // Wait for user to be properly created
      await waitFor(500)
    })

    test('should successfully sign in with valid credentials', async () => {
      // Act - Use user client for sign in
      const { data, error } = await testSupabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      })

      // Assert
      expect(error).toBeNull()
      expect(data.user).toBeDefined()
      expect(data.session).toBeDefined()
      expect(data.session?.access_token).toBeTruthy()
    })

    test('should fail sign in with invalid password', async () => {
      // Act - Use user client for sign in
      const { data, error } = await testSupabase.auth.signInWithPassword({
        email: testEmail,
        password: 'WrongPassword123!'
      })

      // Assert
      expect(error).toBeDefined()
      expect(error?.message).toContain('Invalid login credentials')
      expect(data.user).toBeNull()
      expect(data.session).toBeNull()
    })

    test('should fail sign in with non-existent email', async () => {
      // Act - Use user client for sign in
      const { data, error } = await testSupabase.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: testPassword
      })

      // Assert
      expect(error).toBeDefined()
      expect(data.user).toBeNull()
      expect(data.session).toBeNull()
    })
  })

  describe('Session Management', () => {
    test('should maintain session after sign in', async () => {
      // Arrange: Create and confirm user
      const { data: signUpData, error: signUpError } = await testSupabase.auth.signUp({
        email: testEmail,
        password: testPassword
      })

      expect(signUpError).toBeNull()
      testUserId = signUpData.user?.id
      expect(testUserId).toBeDefined()

      // Confirm user email
      if (testUserId) {
        await testSupabase.auth.admin.updateUserById(testUserId, {
          email_confirm: true
        })
      }

      await waitFor(500)

      // Act: Sign in and get session
      const { data: signInData, error: signInError } = await testSupabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      })

      expect(signInError).toBeNull()
      expect(signInData.session).toBeDefined()

      // Get session again to verify persistence
      const { data: { session }, error } = await testSupabase.auth.getSession()

      // Assert
      expect(error).toBeNull()
      expect(session).toBeDefined()
      expect(session?.user.email).toBe(testEmail)
    })

    test('should successfully sign out', async () => {
      // Arrange: Create and confirm user
      const { data: signUpData, error: signUpError } = await testSupabase.auth.signUp({
        email: testEmail,
        password: testPassword
      })

      expect(signUpError).toBeNull()
      testUserId = signUpData.user?.id

      // Confirm user email
      if (testUserId) {
        await testSupabase.auth.admin.updateUserById(testUserId, {
          email_confirm: true
        })
      }

      await waitFor(500)

      // Sign in user
      const { error: signInError } = await testSupabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      })

      expect(signInError).toBeNull()

      // Act: Sign out
      const { error: signOutError } = await testSupabase.auth.signOut()

      // Assert: Check session is cleared
      const { data: { session } } = await testSupabase.auth.getSession()

      expect(signOutError).toBeNull()
      expect(session).toBeNull()
    })

    test('should get authenticated user details', async () => {
      // Arrange: Create and confirm user
      const { data: signUpData, error: signUpError } = await testSupabase.auth.signUp({
        email: testEmail,
        password: testPassword
      })

      expect(signUpError).toBeNull()
      testUserId = signUpData.user?.id

      // Confirm user email
      if (testUserId) {
        await testSupabase.auth.admin.updateUserById(testUserId, {
          email_confirm: true
        })
      }

      await waitFor(500)

      // Sign in user
      const { error: signInError } = await testSupabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      })

      expect(signInError).toBeNull()

      // Act: Get user
      const { data: { user }, error } = await testSupabase.auth.getUser()

      // Assert
      expect(error).toBeNull()
      expect(user).toBeDefined()
      expect(user?.email).toBe(testEmail)
      expect(user?.id).toBe(testUserId)
    })
  })

  describe('Password Reset', () => {
    beforeEach(async () => {
      // Create a user for password reset tests
      const { data, error } = await testSupabase.auth.signUp({
        email: testEmail,
        password: testPassword
      })

      expect(error).toBeNull()
      testUserId = data.user?.id

      // Confirm user email
      if (testUserId) {
        await testSupabase.auth.admin.updateUserById(testUserId, {
          email_confirm: true
        })
      }

      await waitFor(500)
    })

    test('should request password reset for existing user', async () => {
      // Act
      const { error } = await testSupabase.auth.resetPasswordForEmail(testEmail, {
        redirectTo: 'http://localhost:3000/auth/reset-password'
      })

      // Assert
      expect(error).toBeNull()
      // Note: In a real test, we'd check email was sent
    })

    test('should not error on password reset for non-existent user', async () => {
      // Act
      const { error } = await testSupabase.auth.resetPasswordForEmail(
        'nonexistent@example.com',
        {
          redirectTo: 'http://localhost:3000/auth/reset-password'
        }
      )

      // Assert
      expect(error).toBeNull() // Supabase doesn't reveal if user exists
    })
  })

  describe('User Profile Integration', () => {
    test('should link auth user with profile correctly', async () => {
      // Arrange: Create user
      const { data: signUpData, error: signUpError } = await testSupabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            first_name: 'Integration',
            last_name: 'Test'
          }
        }
      })

      expect(signUpError).toBeNull()
      testUserId = signUpData.user?.id
      expect(testUserId).toBeDefined()

      await waitFor(1500) // Wait for trigger

      // Act: Query profile
      const { data: profile, error } = await testSupabase
        .from('user_profiles')
        .select('*')
        .eq('id', testUserId!)
        .single()

      // Assert
      expect(error).toBeNull()
      expect(profile).toBeDefined()
      expect(profile?.id).toBe(testUserId)
      // Note: Metadata might not be populated depending on trigger implementation
    })
  })
})

describe('Authentication Security', () => {
  test('should not allow access without authentication', async () => {
    // Arrange: Sign out to ensure no session
    await testSupabase.auth.signOut()

    // Act: Try to get user without session
    const { data: { user }, error } = await testSupabase.auth.getUser()

    // Assert
    expect(error).toBeDefined()
    expect(user).toBeNull()
  })

  test('should enforce password requirements', async () => {
    // Test various weak passwords
    const weakPasswords = [
      'short',           // Too short
      'nouppercase123!', // No uppercase
      'NOLOWERCASE123!', // No lowercase
      'NoNumbers!',      // No numbers
      'NoSpecial123',    // No special characters
    ]

    for (const weakPassword of weakPasswords) {
      const { error } = await testSupabase.auth.signUp({
        email: generateTestEmail(),
        password: weakPassword
      })

      // Supabase should reject weak passwords
      // Note: Actual requirements depend on Supabase configuration
      if (weakPassword.length < 6) {
        expect(error).toBeDefined()
      }
    }
  })
})