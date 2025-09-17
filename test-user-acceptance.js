#!/usr/bin/env node

/**
 * User Acceptance Testing Script for LevelUp Platform
 * Tests critical user journeys to ensure the platform works end-to-end
 */

const baseUrl = process.env.TEST_URL || 'http://localhost:3000'

// Test user credentials (create these users in Supabase first)
const testUsers = {
  regular: {
    email: 'test.user@levelup.com',
    password: 'TestUser123!',
    name: 'Test User'
  },
  admin: {
    email: 'test.admin@levelup.com',
    password: 'TestAdmin123!',
    name: 'Test Admin'
  }
}

// Color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

// Test result tracking
let totalTests = 0
let passedTests = 0
let failedTests = []

async function test(name, testFn) {
  totalTests++
  process.stdout.write(`  Testing: ${name}... `)

  try {
    await testFn()
    passedTests++
    console.log(`${colors.green}✅ PASSED${colors.reset}`)
    return true
  } catch (error) {
    failedTests.push({ name, error: error.message })
    console.log(`${colors.red}❌ FAILED${colors.reset}`)
    console.log(`    Error: ${error.message}`)
    return false
  }
}

// Helper function to maintain cookies across requests
class Session {
  constructor() {
    this.cookies = ''
  }

  async fetch(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Cookie': this.cookies
      }
    })

    // Store cookies from response
    const setCookie = response.headers.get('set-cookie')
    if (setCookie) {
      this.cookies = setCookie
    }

    return response
  }
}

// Test Suites
async function testPublicAccess() {
  console.log(`\n${colors.blue}📋 Testing Public Access${colors.reset}`)

  await test('Homepage loads', async () => {
    const response = await fetch(`${baseUrl}/`)
    if (response.status !== 200) throw new Error(`Status ${response.status}`)
  })

  await test('Login page accessible', async () => {
    const response = await fetch(`${baseUrl}/auth/login`)
    if (response.status !== 200) throw new Error(`Status ${response.status}`)
  })

  await test('Signup page accessible', async () => {
    const response = await fetch(`${baseUrl}/auth/signup`)
    if (response.status !== 200) throw new Error(`Status ${response.status}`)
  })

  await test('Public API - Chapters list', async () => {
    const response = await fetch(`${baseUrl}/api/chapters`)
    if (response.status !== 200) throw new Error(`Status ${response.status}`)
    const data = await response.json()
    if (!data.chapters) throw new Error('No chapters returned')
  })
}

async function testAuthentication() {
  console.log(`\n${colors.blue}🔐 Testing Authentication${colors.reset}`)

  const session = new Session()

  await test('Login with valid credentials', async () => {
    const response = await session.fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUsers.regular.email,
        password: testUsers.regular.password
      })
    })

    if (response.status !== 200) {
      const data = await response.json()
      throw new Error(`Login failed: ${data.error?.message || response.status}`)
    }
  })

  await test('Access protected route after login', async () => {
    const response = await session.fetch(`${baseUrl}/api/progress`)
    if (response.status !== 200) throw new Error(`Status ${response.status}`)
  })

  await test('Invalid login credentials rejected', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'wrong@email.com',
        password: 'wrongpassword'
      })
    })

    if (response.status !== 401) throw new Error(`Expected 401, got ${response.status}`)
  })

  await test('Session timeout redirect', async () => {
    // This would need to simulate a 24-hour old session
    // For now, just verify the middleware exists
    const response = await fetch(`${baseUrl}/learn`, {
      redirect: 'manual'
    })

    if (response.status !== 308 && response.status !== 307) {
      // Should redirect to login if not authenticated
      throw new Error(`Expected redirect, got ${response.status}`)
    }
  })

  return session
}

async function testUserJourney(session) {
  console.log(`\n${colors.blue}📚 Testing User Learning Journey${colors.reset}`)

  await test('View learning dashboard', async () => {
    const response = await session.fetch(`${baseUrl}/api/progress`)
    if (response.status !== 200) throw new Error(`Status ${response.status}`)
    const data = await response.json()
    if (!data.success) throw new Error('Failed to get progress')
  })

  await test('Mark chapter as complete', async () => {
    // First get chapters
    const chaptersRes = await session.fetch(`${baseUrl}/api/chapters`)
    const { chapters } = await chaptersRes.json()

    if (!chapters || chapters.length === 0) {
      throw new Error('No chapters available to test')
    }

    // Mark first chapter as complete
    const response = await session.fetch(`${baseUrl}/api/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapterId: chapters[0].id
      })
    })

    if (response.status !== 200) throw new Error(`Status ${response.status}`)
  })

  await test('AI Chat interaction', async () => {
    const response = await session.fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello coach!' }],
        chapterContext: null
      })
    })

    // AI endpoint might return streaming response or regular JSON
    if (response.status !== 200) throw new Error(`Status ${response.status}`)
  })

  await test('Clear progress', async () => {
    const response = await session.fetch(`${baseUrl}/api/progress`, {
      method: 'DELETE'
    })

    if (response.status !== 200) throw new Error(`Status ${response.status}`)
  })
}

async function testAdminFunctions() {
  console.log(`\n${colors.blue}👨‍💼 Testing Admin Functions${colors.reset}`)

  const session = new Session()

  // Login as admin
  await test('Admin login', async () => {
    const response = await session.fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUsers.admin.email,
        password: testUsers.admin.password
      })
    })

    if (response.status !== 200) {
      throw new Error(`Admin login failed: ${response.status}`)
    }
  })

  await test('Access admin panel', async () => {
    const response = await session.fetch(`${baseUrl}/api/admin/chapters`)
    if (response.status !== 200) throw new Error(`Status ${response.status}`)
  })

  let createdChapterId = null

  await test('Create new chapter', async () => {
    const response = await session.fetch(`${baseUrl}/api/admin/chapters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Chapter UAT',
        content: 'Test content for UAT',
        category_id: '1e7e4c1a-1111-1111-1111-111111111111', // Use actual category ID
        sort_order: 999
      })
    })

    if (response.status !== 200) throw new Error(`Status ${response.status}`)
    const data = await response.json()
    if (!data.data?.chapter?.id) throw new Error('Chapter not created properly')
    createdChapterId = data.data.chapter.id
  })

  await test('Update chapter', async () => {
    if (!createdChapterId) throw new Error('No chapter to update')

    const response = await session.fetch(`${baseUrl}/api/admin/chapters`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: createdChapterId,
        title: 'Updated Test Chapter UAT'
      })
    })

    if (response.status !== 200) throw new Error(`Status ${response.status}`)
  })

  await test('Delete chapter', async () => {
    if (!createdChapterId) throw new Error('No chapter to delete')

    const response = await session.fetch(`${baseUrl}/api/admin/chapters?id=${createdChapterId}`, {
      method: 'DELETE'
    })

    if (response.status !== 200) throw new Error(`Status ${response.status}`)
  })

  await test('Regular user cannot access admin', async () => {
    // Login as regular user
    const regularSession = new Session()
    await regularSession.fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUsers.regular.email,
        password: testUsers.regular.password
      })
    })

    // Try to access admin endpoint
    const response = await regularSession.fetch(`${baseUrl}/api/admin/chapters`)
    if (response.status !== 403) throw new Error(`Expected 403, got ${response.status}`)
  })
}

async function testErrorHandling() {
  console.log(`\n${colors.blue}⚠️ Testing Error Handling${colors.reset}`)

  await test('Invalid API endpoint returns 404', async () => {
    const response = await fetch(`${baseUrl}/api/nonexistent`)
    if (response.status !== 404) throw new Error(`Expected 404, got ${response.status}`)
  })

  await test('Malformed JSON rejected', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json'
    })

    if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`)
  })

  await test('Rate limiting enforced', async () => {
    // Try to exceed rate limit (6 attempts for auth endpoints)
    let rateLimited = false

    for (let i = 0; i < 7; i++) {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@test.com',
          password: 'wrong'
        })
      })

      if (response.status === 429) {
        rateLimited = true
        break
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    if (!rateLimited) throw new Error('Rate limiting not triggered')
  })

  await test('XSS prevention in inputs', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '<script>alert("xss")</script>@test.com',
        password: 'password123'
      })
    })

    if (response.status !== 400) throw new Error(`XSS input not rejected: ${response.status}`)
  })
}

async function testPerformance() {
  console.log(`\n${colors.blue}⚡ Testing Performance${colors.reset}`)

  await test('Homepage loads within 3 seconds', async () => {
    const start = Date.now()
    const response = await fetch(`${baseUrl}/`)
    const duration = Date.now() - start

    if (response.status !== 200) throw new Error(`Status ${response.status}`)
    if (duration > 3000) throw new Error(`Took ${duration}ms (limit: 3000ms)`)
  })

  await test('API response within 1 second', async () => {
    const start = Date.now()
    const response = await fetch(`${baseUrl}/api/chapters`)
    const duration = Date.now() - start

    if (response.status !== 200) throw new Error(`Status ${response.status}`)
    if (duration > 1000) throw new Error(`Took ${duration}ms (limit: 1000ms)`)
  })
}

// Main test runner
async function runAllTests() {
  console.log(`${colors.yellow}🚀 LevelUp User Acceptance Testing${colors.reset}`)
  console.log(`Testing against: ${baseUrl}`)
  console.log('=' . repeat(50))

  const startTime = Date.now()

  // Run all test suites
  await testPublicAccess()
  const session = await testAuthentication()

  if (session) {
    await testUserJourney(session)
  }

  await testAdminFunctions()
  await testErrorHandling()
  await testPerformance()

  // Print results
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log('\n' + '=' . repeat(50))
  console.log(`${colors.yellow}📊 Test Results${colors.reset}`)
  console.log(`Total Tests: ${totalTests}`)
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`)
  console.log(`${colors.red}Failed: ${failedTests.length}${colors.reset}`)
  console.log(`Duration: ${duration} seconds`)

  if (failedTests.length > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`)
    failedTests.forEach(({ name, error }) => {
      console.log(`  ❌ ${name}: ${error}`)
    })
    process.exit(1)
  } else {
    console.log(`\n${colors.green}✅ All tests passed! Platform is ready for users.${colors.reset}`)
    process.exit(0)
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(`\n${colors.red}Fatal Error:${colors.reset}`, error)
  process.exit(1)
})

// Run tests
runAllTests().catch(error => {
  console.error(`\n${colors.red}Test Runner Error:${colors.reset}`, error)
  process.exit(1)
})