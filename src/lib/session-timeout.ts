import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Session timeout duration (24 hours in milliseconds)
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000

export async function checkSessionTimeout(request: NextRequest) {
  const supabase = await createClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (!session) {
    return { isValid: false, reason: 'no_session' }
  }

  // Check if session has expired based on expires_at
  const expiresAt = new Date(session.expires_at! * 1000)
  const now = new Date()

  if (now > expiresAt) {
    // Session has expired based on JWT expiry
    await supabase.auth.signOut()
    return { isValid: false, reason: 'jwt_expired' }
  }

  // Additional check: enforce our own 24-hour timeout
  const issuedAt = new Date(session.access_token ?
    JSON.parse(atob(session.access_token.split('.')[1])).iat * 1000 :
    Date.now()
  )

  const sessionAge = now.getTime() - issuedAt.getTime()

  if (sessionAge > SESSION_TIMEOUT_MS) {
    // Session is older than 24 hours
    await supabase.auth.signOut()
    return { isValid: false, reason: 'session_timeout' }
  }

  // Check if session will expire soon (within 5 minutes)
  const timeUntilExpiry = expiresAt.getTime() - now.getTime()
  const REFRESH_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

  if (timeUntilExpiry < REFRESH_THRESHOLD_MS) {
    // Try to refresh the session
    const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession()

    if (refreshError || !newSession) {
      await supabase.auth.signOut()
      return { isValid: false, reason: 'refresh_failed' }
    }

    return { isValid: true, refreshed: true }
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
  } else if (reason === 'refresh_failed') {
    redirectUrl.searchParams.set('message', 'Unable to refresh session. Please sign in again.')
  }

  return NextResponse.redirect(redirectUrl)
}