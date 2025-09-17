import { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Session timeout duration (24 hours in milliseconds)
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000

// Safe base64url decoder for JWT payloads
function decodeBase64Url(base64url: string): string {
  try {
    // Convert base64url to base64
    let base64 = base64url
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    // Pad with = if necessary
    const pad = base64.length % 4
    if (pad) {
      base64 += '='.repeat(4 - pad)
    }

    return atob(base64)
  } catch (error) {
    console.error('Failed to decode JWT payload:', error)
    return ''
  }
}

// Parse JWT payload safely
function parseJWTPayload(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const payload = decodeBase64Url(parts[1])
    if (!payload) {
      return null
    }

    return JSON.parse(payload)
  } catch (error) {
    console.error('Failed to parse JWT:', error)
    return null
  }
}

// Check session timeout using the Edge-compatible Supabase client
export async function checkSessionTimeout(
  session: any | null,
  supabase: SupabaseClient
): Promise<{ isValid: boolean; reason?: string; refreshed?: boolean }> {
  if (!session) {
    return { isValid: false, reason: 'no_session' }
  }

  const now = new Date()

  // Check if session has expired based on expires_at
  if (session.expires_at) {
    const expiresAt = new Date(session.expires_at * 1000)

    if (now > expiresAt) {
      // Session has expired based on JWT expiry
      // Note: signOut won't work in Edge runtime, handle in middleware
      return { isValid: false, reason: 'jwt_expired' }
    }

    // Check if session will expire soon (within 5 minutes)
    const timeUntilExpiry = expiresAt.getTime() - now.getTime()
    const REFRESH_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

    if (timeUntilExpiry < REFRESH_THRESHOLD_MS) {
      // Session needs refresh (handle in middleware)
      return { isValid: false, reason: 'needs_refresh' }
    }
  }

  // Additional check: enforce our own 24-hour timeout
  if (session.access_token) {
    const payload = parseJWTPayload(session.access_token)

    if (payload && payload.iat) {
      const issuedAt = new Date(payload.iat * 1000)
      const sessionAge = now.getTime() - issuedAt.getTime()

      if (sessionAge > SESSION_TIMEOUT_MS) {
        // Session is older than 24 hours
        return { isValid: false, reason: 'session_timeout' }
      }
    }
  }

  return { isValid: true }
}

export function createSessionTimeoutResponse(request: NextRequest, reason: string) {
  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = '/auth/login'
  redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)

  // Add specific timeout reason for better UX
  if (reason === 'session_timeout') {
    redirectUrl.searchParams.set('message', 'Your session has expired. Please sign in again.')
  } else if (reason === 'refresh_failed' || reason === 'needs_refresh') {
    redirectUrl.searchParams.set('message', 'Unable to refresh session. Please sign in again.')
  } else if (reason === 'jwt_expired') {
    redirectUrl.searchParams.set('message', 'Your session has expired. Please sign in again.')
  }

  return NextResponse.redirect(redirectUrl)
}