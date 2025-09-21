import { RateLimiterMemory } from 'rate-limiter-flexible'
import { NextRequest, NextResponse } from 'next/server'

// Different rate limiters for different endpoints
const authLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 60, // per 60 seconds
  blockDuration: 300, // block for 5 minutes after exhausting attempts
})

const apiLimiter = new RateLimiterMemory({
  points: 30, // 30 requests
  duration: 60, // per 60 seconds
})

const adminLimiter = new RateLimiterMemory({
  points: 100, // 100 requests for admin operations
  duration: 60, // per 60 seconds
})

type RateLimitResult = {
  success: boolean
  response?: NextResponse
}

export async function checkRateLimit(
  request: NextRequest,
  type: 'auth' | 'api' | 'admin' = 'api'
): Promise<RateLimitResult> {
  try {
    const limiter = type === 'auth' ? authLimiter : type === 'admin' ? adminLimiter : apiLimiter

    // Use IP address as key (fallback to a generic key if IP not available)
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown'

    await limiter.consume(ip)

    return { success: true }
  } catch (rejRes: any) {
    // Rate limit exceeded
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 60

    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: secs
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(secs),
            'X-RateLimit-Limit': String(rejRes.totalPoints),
            'X-RateLimit-Remaining': String(rejRes.remainingPoints || 0),
            'X-RateLimit-Reset': new Date(Date.now() + rejRes.msBeforeNext).toISOString()
          }
        }
      )
    }
  }
}

// Helper function to apply rate limiting to API routes
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse | Response>,
  type: 'auth' | 'api' | 'admin' = 'api'
) {
  return async (request: NextRequest): Promise<NextResponse | Response> => {
    const rateLimitResult = await checkRateLimit(request, type)

    if (!rateLimitResult.success) {
      return rateLimitResult.response!
    }

    return handler(request)
  }
}