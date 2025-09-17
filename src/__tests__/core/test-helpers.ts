import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Use environment variables for test configuration
// These should be set in your test environment or CI/CD pipeline
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate that required environment variables are set
if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error(
    'Missing required environment variables for tests. ' +
    'Please set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
    'in your .env.test.local file or test environment.'
  )
}

// Admin client using service role to bypass RLS for admin operations
// Use this for setup, teardown, and operations that need full access
export const adminSupabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// User client using anon key for testing RLS-protected operations
// Use this when you need to test as an authenticated user
export const userSupabase = createClient(
  supabaseUrl,
  anonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Default export for backward compatibility - uses service role
export const testSupabase = adminSupabase

// Helper to create a fresh user client with no session
export const createUserClient = (): SupabaseClient => {
  return createClient(
    supabaseUrl,
    anonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Generate unique test email with valid domain
export const generateTestEmail = () => {
  // Use a simulated valid domain that Supabase accepts
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`
}

// Clean up test user data
export const cleanupTestUser = async (userId: string) => {
  if (!userId) return

  try {
    // First get all conversations for this user
    const { data: conversations } = await testSupabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId)

    // Delete messages for all user's conversations
    if (conversations && conversations.length > 0) {
      for (const conv of conversations) {
        await testSupabase.from('messages').delete().eq('conversation_id', conv.id)
      }
    }

    // Now delete in order due to foreign keys
    await testSupabase.from('conversations').delete().eq('user_id', userId)
    await testSupabase.from('user_progress').delete().eq('user_id', userId)
    await testSupabase.from('user_profiles').delete().eq('id', userId)

    // Delete from auth.users using admin API
    await testSupabase.auth.admin.deleteUser(userId)
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

// Wait helper for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Mock fetch for API tests
export const mockFetch = (response: any, status = 200) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response))
    } as Response)
  )
}

// Test user credentials - using a shared approach to reduce API calls
export const TEST_USER = {
  email: 'testuser@test.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User'
}

// Rate limiting helper - add progressive delays
let lastCallTime = 0
export const withRateLimit = async (fn: () => Promise<any>, minDelay = 1000) => {
  const now = Date.now()
  const timeSinceLastCall = now - lastCallTime

  if (timeSinceLastCall < minDelay) {
    await waitFor(minDelay - timeSinceLastCall)
  }

  lastCallTime = Date.now()
  return await fn()
}

// Reset all mocks
export const resetMocks = () => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
}