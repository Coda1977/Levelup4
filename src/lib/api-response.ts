import { NextResponse } from 'next/server'

type ApiError = {
  code: string
  message: string
  statusCode: number
  details?: any
}

// Standard error codes
export const ErrorCodes = {
  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
} as const

// Standard error messages (generic for security)
const ErrorMessages: Record<string, string> = {
  [ErrorCodes.UNAUTHORIZED]: 'Authentication required',
  [ErrorCodes.FORBIDDEN]: 'Access denied',
  [ErrorCodes.INVALID_CREDENTIALS]: 'Invalid credentials provided',
  [ErrorCodes.VALIDATION_ERROR]: 'Invalid input provided',
  [ErrorCodes.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later',
  [ErrorCodes.INTERNAL_ERROR]: 'An error occurred. Please try again later',
  [ErrorCodes.DATABASE_ERROR]: 'An error occurred. Please try again later',
  [ErrorCodes.NOT_FOUND]: 'Resource not found',
  [ErrorCodes.CONFLICT]: 'Resource conflict',
}

// Success response
export function apiSuccess<T = any>(
  data: T,
  message?: string,
  statusCode = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      message,
      data
    },
    { status: statusCode }
  )
}

// Error response
export function apiError(
  code: keyof typeof ErrorCodes,
  customMessage?: string,
  statusCode?: number,
  details?: any
): NextResponse {
  const message = customMessage || ErrorMessages[code] || 'An error occurred'

  const status = statusCode || (() => {
    switch (code) {
      case ErrorCodes.UNAUTHORIZED:
      case ErrorCodes.INVALID_CREDENTIALS:
        return 401
      case ErrorCodes.FORBIDDEN:
        return 403
      case ErrorCodes.NOT_FOUND:
        return 404
      case ErrorCodes.CONFLICT:
        return 409
      case ErrorCodes.RATE_LIMIT_EXCEEDED:
        return 429
      case ErrorCodes.VALIDATION_ERROR:
      case ErrorCodes.INVALID_INPUT:
        return 400
      default:
        return 500
    }
  })()

  const response: any = {
    success: false,
    error: {
      code,
      message
    }
  }

  // Only include details in development
  if (process.env.NODE_ENV === 'development' && details) {
    response.error.details = details
  }

  return NextResponse.json(response, { status })
}

// Validation error response
export function validationError(errors: string | Record<string, any>): NextResponse {
  return apiError(
    'VALIDATION_ERROR',
    typeof errors === 'string' ? errors : 'Validation failed',
    400,
    typeof errors === 'object' ? errors : undefined
  )
}

// Auth error response (generic for security)
export function authError(): NextResponse {
  return apiError('INVALID_CREDENTIALS', 'Invalid credentials', 401)
}

// Forbidden error response
export function forbiddenError(): NextResponse {
  return apiError('FORBIDDEN', 'Access denied', 403)
}

// Not found error response
export function notFoundError(resource = 'Resource'): NextResponse {
  return apiError('NOT_FOUND', `${resource} not found`, 404)
}

// Server error response (generic for security)
export function serverError(error?: Error): NextResponse {
  // Log the actual error server-side
  if (error) {
    console.error('Server error:', error)
  }

  // Return generic error to client
  return apiError('INTERNAL_ERROR', undefined, 500)
}