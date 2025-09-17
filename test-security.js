#!/usr/bin/env node

// Test script for security improvements
const baseUrl = 'http://localhost:3000'

async function testRateLimiting() {
  console.log('\n🔒 Testing Rate Limiting on Login...')

  // Try to exceed rate limit (5 attempts in 60 seconds)
  for (let i = 1; i <= 7; i++) {
    try {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
      })

      const status = response.status
      const data = await response.json()

      console.log(`  Attempt ${i}: Status ${status}`,
        status === 429 ? '❌ Rate limited!' : '✅ Request allowed')

      if (status === 429) {
        console.log(`  Retry after: ${response.headers.get('Retry-After')} seconds`)
      }
    } catch (error) {
      console.error(`  Attempt ${i} failed:`, error.message)
    }
  }
}

async function testValidation() {
  console.log('\n📝 Testing Input Validation...')

  const testCases = [
    {
      name: 'Invalid email',
      endpoint: '/api/auth/login',
      body: { email: 'notanemail', password: '123456' }
    },
    {
      name: 'Short password',
      endpoint: '/api/auth/login',
      body: { email: 'test@example.com', password: '123' }
    },
    {
      name: 'Missing fields',
      endpoint: '/api/auth/signup',
      body: { email: 'test@example.com' }
    },
    {
      name: 'Invalid chapter ID',
      endpoint: '/api/progress',
      method: 'POST',
      body: { chapterId: 'not-a-uuid' }
    }
  ]

  for (const test of testCases) {
    try {
      const response = await fetch(`${baseUrl}${test.endpoint}`, {
        method: test.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.body)
      })

      const data = await response.json()
      console.log(`  ${test.name}: ${response.status === 400 ? '✅' : '❌'} Validation ${response.status === 400 ? 'worked' : 'failed'}`)

      if (data.error && data.error.message) {
        console.log(`    Error: ${data.error.message}`)
      }
    } catch (error) {
      console.error(`  ${test.name} failed:`, error.message)
    }
  }
}

async function testStandardizedErrors() {
  console.log('\n🎯 Testing Standardized Error Messages...')

  try {
    // Test auth error (should be generic)
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      })
    })

    const data = await response.json()
    console.log('  Auth error response:', data.success === false ? '✅' : '❌',
      'Standardized format')
    console.log('    Has error code:', data.error?.code ? '✅' : '❌')
    console.log('    Generic message:', data.error?.message === 'Invalid credentials' ? '✅' : '❌')
  } catch (error) {
    console.error('  Test failed:', error.message)
  }
}

async function runAllTests() {
  console.log('🚀 Security Improvements Test Suite')
  console.log('=' . repeat(40))

  await testValidation()
  await testStandardizedErrors()
  await testRateLimiting()

  console.log('\n✨ Security tests complete!')
}

// Run tests
runAllTests().catch(console.error)