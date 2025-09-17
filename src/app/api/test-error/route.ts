import { NextRequest } from 'next/server'
import { apiError } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  // This endpoint deliberately throws an error to test monitoring
  try {
    // Simulate an error
    throw new Error('Test error from /api/test-error endpoint - monitoring system verification')
  } catch (error) {
    // This should log to the database
    return apiError(
      'Intentional test error for monitoring system',
      500,
      request,
      error
    )
  }
}