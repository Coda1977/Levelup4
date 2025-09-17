import { createClient } from '@/lib/supabase-client'
import { NextRequest } from 'next/server'

interface ErrorLogData {
  message: string
  error?: any
  type?: 'api' | 'auth' | 'database' | 'validation' | 'unknown'
  endpoint?: string
  method?: string
  statusCode?: number
  userId?: string
  userEmail?: string
  metadata?: Record<string, any>
  request?: NextRequest
}

/**
 * Simple error logger that writes to database
 * Falls back to console.error if database write fails
 */
export async function logError(data: ErrorLogData) {
  const {
    message,
    error,
    type = 'unknown',
    endpoint,
    method,
    statusCode,
    userId,
    userEmail,
    metadata,
    request
  } = data

  // Always log to console for immediate visibility
  console.error(`[ERROR] ${type}:`, message, error)

  try {
    const supabase = await createClient()

    // Extract request details if provided
    let ipAddress: string | undefined
    let userAgent: string | undefined

    if (request) {
      // Get IP from headers (works with Vercel)
      ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                  request.headers.get('x-real-ip') ||
                  undefined

      userAgent = request.headers.get('user-agent') || undefined
    }

    // Prepare error details
    const errorLog = {
      error_message: message.substring(0, 1000), // Limit message length
      error_stack: error?.stack?.substring(0, 5000), // Limit stack trace
      error_type: type,
      endpoint: endpoint || request?.url,
      method: method || request?.method,
      status_code: statusCode,
      user_id: userId,
      user_email: userEmail,
      ip_address: ipAddress,
      user_agent: userAgent?.substring(0, 500), // Limit user agent
      metadata: metadata || (error && typeof error === 'object' ?
        { name: error.name, code: error.code } : undefined)
    }

    // Insert to database (using service role for bypass RLS)
    const { error: insertError } = await supabase
      .from('error_logs')
      .insert(errorLog)

    if (insertError) {
      // If we can't log to database, at least log this failure
      console.error('[ERROR] Failed to log error to database:', insertError)
    }
  } catch (loggerError) {
    // Don't let logging errors break the app
    console.error('[ERROR] Error logger failed:', loggerError)
  }
}

/**
 * Convenience function for API route errors
 */
export async function logApiError(
  request: NextRequest,
  error: any,
  message: string,
  statusCode = 500
) {
  // Try to get user info from session
  let userId: string | undefined
  let userEmail: string | undefined

  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    userId = session?.user?.id
    userEmail = session?.user?.email
  } catch {
    // Ignore session errors
  }

  await logError({
    message,
    error,
    type: 'api',
    endpoint: request.url,
    method: request.method,
    statusCode,
    userId,
    userEmail,
    request
  })
}