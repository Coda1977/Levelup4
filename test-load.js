#!/usr/bin/env node

/**
 * Load Testing Script for LevelUp Platform
 * Tests if the platform can handle 10+ concurrent users
 */

const baseUrl = process.env.TEST_URL || 'http://localhost:3000'

// Configuration
const config = {
  concurrentUsers: 10,  // Number of simultaneous users
  testDuration: 30,     // Test duration in seconds
  rampUpTime: 5,        // Time to ramp up to full load (seconds)
}

// Test user pool (create these in Supabase first)
const userPool = Array.from({ length: 10 }, (_, i) => ({
  email: `loadtest.user${i + 1}@levelup.com`,
  password: 'LoadTest123!',
  name: `Load Test User ${i + 1}`
}))

// Metrics tracking
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: [],
  userSessions: new Map(),
  startTime: null,
  endTime: null
}

// Color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
}

// Virtual User Class
class VirtualUser {
  constructor(id, credentials) {
    this.id = id
    this.credentials = credentials
    this.cookies = ''
    this.isActive = true
    this.requestCount = 0
    this.errors = []
  }

  async makeRequest(url, options = {}) {
    const start = Date.now()
    metrics.totalRequests++
    this.requestCount++

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Cookie': this.cookies
        },
        // Add timeout
        signal: AbortSignal.timeout(10000)
      })

      // Store cookies
      const setCookie = response.headers.get('set-cookie')
      if (setCookie) {
        this.cookies = setCookie
      }

      const duration = Date.now() - start
      metrics.responseTimes.push(duration)

      if (response.ok) {
        metrics.successfulRequests++
      } else {
        metrics.failedRequests++
        this.errors.push(`${options.method || 'GET'} ${url}: ${response.status}`)
      }

      return response
    } catch (error) {
      const duration = Date.now() - start
      metrics.responseTimes.push(duration)
      metrics.failedRequests++
      this.errors.push(`${options.method || 'GET'} ${url}: ${error.message}`)
      throw error
    }
  }

  async login() {
    try {
      const response = await this.makeRequest(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.credentials.email,
          password: this.credentials.password
        })
      })

      return response.ok
    } catch (error) {
      console.log(`${colors.red}User ${this.id} login failed: ${error.message}${colors.reset}`)
      return false
    }
  }

  async simulateUserJourney() {
    // Simulate realistic user behavior with random delays
    const actions = [
      // View chapters
      async () => {
        await this.makeRequest(`${baseUrl}/api/chapters`)
        await this.randomDelay(1000, 3000)
      },

      // Check progress
      async () => {
        await this.makeRequest(`${baseUrl}/api/progress`)
        await this.randomDelay(2000, 5000)
      },

      // Mark chapter complete
      async () => {
        const chaptersRes = await this.makeRequest(`${baseUrl}/api/chapters`)
        if (chaptersRes.ok) {
          const { chapters } = await chaptersRes.json()
          if (chapters && chapters.length > 0) {
            const randomChapter = chapters[Math.floor(Math.random() * chapters.length)]
            await this.makeRequest(`${baseUrl}/api/progress`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chapterId: randomChapter.id })
            })
          }
        }
        await this.randomDelay(3000, 8000)
      },

      // Use AI chat
      async () => {
        await this.makeRequest(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{
              role: 'user',
              content: `Question from user ${this.id}: What is effective management?`
            }],
            chapterContext: null
          })
        })
        await this.randomDelay(5000, 10000)
      }
    ]

    // Run actions while test is active
    while (this.isActive) {
      const randomAction = actions[Math.floor(Math.random() * actions.length)]
      try {
        await randomAction()
      } catch (error) {
        // Continue despite errors
      }
    }
  }

  async randomDelay(min, max) {
    const delay = Math.random() * (max - min) + min
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  stop() {
    this.isActive = false
  }

  getStats() {
    return {
      id: this.id,
      requestCount: this.requestCount,
      errorCount: this.errors.length,
      errors: this.errors.slice(0, 5) // First 5 errors
    }
  }
}

// Load Test Scenarios
async function runLoadTest() {
  console.log(`${colors.cyan}🚀 Starting Load Test${colors.reset}`)
  console.log(`Concurrent Users: ${config.concurrentUsers}`)
  console.log(`Test Duration: ${config.testDuration} seconds`)
  console.log(`Target: ${baseUrl}`)
  console.log('=' . repeat(50))

  metrics.startTime = Date.now()
  const users = []

  // Ramp up users gradually
  console.log(`\n${colors.blue}📈 Ramping up users...${colors.reset}`)
  const rampUpDelay = (config.rampUpTime * 1000) / config.concurrentUsers

  for (let i = 0; i < config.concurrentUsers; i++) {
    const user = new VirtualUser(i + 1, userPool[i] || userPool[0])
    users.push(user)

    // Start user activity
    (async () => {
      const loggedIn = await user.login()
      if (loggedIn) {
        console.log(`${colors.green}User ${user.id} logged in${colors.reset}`)
        metrics.userSessions.set(user.id, 'active')
        user.simulateUserJourney()
      } else {
        console.log(`${colors.red}User ${user.id} login failed${colors.reset}`)
        metrics.userSessions.set(user.id, 'failed')
      }
    })()

    await new Promise(resolve => setTimeout(resolve, rampUpDelay))
  }

  // Monitor progress
  console.log(`\n${colors.blue}🔄 Running load test...${colors.reset}`)
  const progressInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - metrics.startTime) / 1000)
    const avgResponseTime = metrics.responseTimes.length > 0
      ? (metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length).toFixed(0)
      : 0

    process.stdout.write(`\r  Time: ${elapsed}s | Requests: ${metrics.totalRequests} | Success: ${metrics.successfulRequests} | Failed: ${metrics.failedRequests} | Avg Response: ${avgResponseTime}ms`)
  }, 1000)

  // Run for specified duration
  await new Promise(resolve => setTimeout(resolve, config.testDuration * 1000))

  // Stop all users
  console.log(`\n\n${colors.yellow}🛑 Stopping load test...${colors.reset}`)
  clearInterval(progressInterval)
  users.forEach(user => user.stop())

  // Wait for pending requests
  await new Promise(resolve => setTimeout(resolve, 2000))

  metrics.endTime = Date.now()

  // Generate report
  generateReport(users)
}

function generateReport(users) {
  console.log('\n' + '=' . repeat(50))
  console.log(`${colors.cyan}📊 Load Test Results${colors.reset}`)
  console.log('=' . repeat(50))

  const duration = (metrics.endTime - metrics.startTime) / 1000
  const requestsPerSecond = (metrics.totalRequests / duration).toFixed(2)
  const successRate = ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)

  // Calculate percentiles
  const sortedTimes = metrics.responseTimes.sort((a, b) => a - b)
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)]
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)]
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)]

  console.log(`\n${colors.blue}Summary:${colors.reset}`)
  console.log(`  Duration: ${duration} seconds`)
  console.log(`  Total Requests: ${metrics.totalRequests}`)
  console.log(`  Requests/Second: ${requestsPerSecond}`)
  console.log(`  Success Rate: ${successRate}%`)

  console.log(`\n${colors.blue}Response Times:${colors.reset}`)
  console.log(`  Median (P50): ${p50}ms`)
  console.log(`  P95: ${p95}ms`)
  console.log(`  P99: ${p99}ms`)
  console.log(`  Min: ${Math.min(...sortedTimes)}ms`)
  console.log(`  Max: ${Math.max(...sortedTimes)}ms`)

  console.log(`\n${colors.blue}User Statistics:${colors.reset}`)
  const activeUsers = Array.from(metrics.userSessions.values()).filter(s => s === 'active').length
  console.log(`  Active Users: ${activeUsers}/${config.concurrentUsers}`)
  console.log(`  Failed Logins: ${config.concurrentUsers - activeUsers}`)

  // Per-user stats
  console.log(`\n${colors.blue}Per-User Activity:${colors.reset}`)
  users.slice(0, 5).forEach(user => {
    const stats = user.getStats()
    console.log(`  User ${stats.id}: ${stats.requestCount} requests, ${stats.errorCount} errors`)
  })

  // Error analysis
  if (metrics.failedRequests > 0) {
    console.log(`\n${colors.yellow}⚠️ Errors Detected:${colors.reset}`)
    const errorTypes = {}
    users.forEach(user => {
      user.errors.forEach(error => {
        const key = error.split(':')[1]?.trim() || 'Unknown'
        errorTypes[key] = (errorTypes[key] || 0) + 1
      })
    })

    Object.entries(errorTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([error, count]) => {
        console.log(`  ${error}: ${count} occurrences`)
      })
  }

  // Performance verdict
  console.log(`\n${colors.cyan}🎯 Performance Verdict:${colors.reset}`)

  const passed = []
  const failed = []

  // Check criteria
  if (successRate >= 95) {
    passed.push('Success rate > 95%')
  } else {
    failed.push(`Success rate only ${successRate}%`)
  }

  if (p95 < 1000) {
    passed.push('P95 response time < 1 second')
  } else {
    failed.push(`P95 response time ${p95}ms (> 1 second)`)
  }

  if (activeUsers >= config.concurrentUsers * 0.9) {
    passed.push(`${activeUsers} users handled concurrently`)
  } else {
    failed.push(`Only ${activeUsers}/${config.concurrentUsers} users could connect`)
  }

  if (passed.length > 0) {
    console.log(`${colors.green}✅ Passed:${colors.reset}`)
    passed.forEach(p => console.log(`  - ${p}`))
  }

  if (failed.length > 0) {
    console.log(`${colors.red}❌ Failed:${colors.reset}`)
    failed.forEach(f => console.log(`  - ${f}`))
  }

  // Final verdict
  if (failed.length === 0) {
    console.log(`\n${colors.green}🎉 LOAD TEST PASSED! Platform can handle ${config.concurrentUsers} concurrent users.${colors.reset}`)
  } else if (failed.length <= 1) {
    console.log(`\n${colors.yellow}⚠️ LOAD TEST PARTIALLY PASSED. Some optimization needed.${colors.reset}`)
  } else {
    console.log(`\n${colors.red}❌ LOAD TEST FAILED. Performance issues detected.${colors.reset}`)
  }

  // Recommendations
  console.log(`\n${colors.blue}💡 Recommendations:${colors.reset}`)
  if (p95 > 500) {
    console.log('  - Consider caching frequently accessed data')
  }
  if (successRate < 98) {
    console.log('  - Investigate error patterns and add retry logic')
  }
  if (activeUsers < config.concurrentUsers) {
    console.log('  - Check authentication system capacity')
  }
  console.log('  - Monitor database connection pool size')
  console.log('  - Consider implementing CDN for static assets')
}

// Stress test (optional - more aggressive)
async function runStressTest() {
  console.log(`${colors.red}🔥 Running Stress Test (Finding Breaking Point)${colors.reset}`)

  let concurrentUsers = 10
  let testPassed = true

  while (testPassed && concurrentUsers <= 100) {
    console.log(`\nTesting with ${concurrentUsers} users...`)

    // Reset metrics
    metrics.totalRequests = 0
    metrics.successfulRequests = 0
    metrics.failedRequests = 0
    metrics.responseTimes = []

    // Run mini load test
    config.concurrentUsers = concurrentUsers
    config.testDuration = 10 // Shorter duration for stress test

    await runLoadTest()

    // Check if system handled it
    const successRate = (metrics.successfulRequests / metrics.totalRequests) * 100
    testPassed = successRate >= 90

    if (testPassed) {
      console.log(`${colors.green}System handled ${concurrentUsers} users${colors.reset}`)
      concurrentUsers += 10
    } else {
      console.log(`${colors.red}System broke at ${concurrentUsers} users${colors.reset}`)
    }
  }

  console.log(`\n${colors.yellow}Maximum concurrent users: ${concurrentUsers - 10}${colors.reset}`)
}

// Main execution
async function main() {
  const mode = process.argv[2] || 'load'

  console.log(`${colors.cyan}🧪 LevelUp Platform Load Testing${colors.reset}`)
  console.log('=' . repeat(50))

  try {
    if (mode === 'stress') {
      await runStressTest()
    } else {
      await runLoadTest()
    }
  } catch (error) {
    console.error(`${colors.red}Test failed:${colors.reset}`, error)
    process.exit(1)
  }
}

// Run the tests
main().catch(console.error)