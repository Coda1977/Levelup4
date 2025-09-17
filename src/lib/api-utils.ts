// Simple API utilities - no over-engineering
import { NextResponse, NextRequest } from 'next/server'
import { logApiError } from '@/lib/error-logger'

export function apiError(
  message = 'Something went wrong',
  status = 500,
  request?: NextRequest,
  error?: any
) {
  // Log errors for 500s (server errors)
  if (status >= 500 && request) {
    logApiError(request, error, message, status)
  } else {
    // Still console log for 4xx errors
    console.error(`API Error: ${message}`)
  }

  return NextResponse.json({ error: message }, { status })
}

export function apiSuccess(data: any, status = 200) {
  return NextResponse.json(data, { status })
}