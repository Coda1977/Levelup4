/**
 * Test Setup Verification
 * Ensures test environment and Supabase connection are properly configured
 */

import { testSupabase } from '../utils/test-helpers'

describe('Test Environment Setup', () => {
  test('should have environment variables loaded', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined()
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined()
  })

  test('should connect to Supabase with service role', async () => {
    // Service role should bypass RLS
    const { data, error } = await testSupabase
      .from('chapters')
      .select('id')
      .limit(1)

    expect(error).toBeNull()
    expect(data).toBeDefined()
  })

  test('should be able to create and delete test users', async () => {
    const testEmail = `setup_test_${Date.now()}@example.com`

    // Create user with service role
    const { data: { user }, error: createError } = await testSupabase.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true
    })

    expect(createError).toBeNull()
    expect(user).toBeDefined()
    expect(user?.email).toBe(testEmail)

    // Clean up
    if (user?.id) {
      const { error: deleteError } = await testSupabase.auth.admin.deleteUser(user.id)
      expect(deleteError).toBeNull()
    }
  })

  test('service role should bypass RLS for user_progress', async () => {
    // Try to read user_progress without being authenticated as a user
    const { error } = await testSupabase
      .from('user_progress')
      .select('*')
      .limit(1)

    // Service role should not get RLS errors
    expect(error?.code).not.toBe('42501') // RLS violation code
  })
})