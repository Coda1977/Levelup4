import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export interface AdminAuthResult {
  isAuthorized: boolean
  response?: NextResponse
  user?: any
  profile?: any
}

/**
 * Verifies that the current user is authenticated and has admin privileges
 * Returns an object with authorization status and appropriate response if unauthorized
 */
export async function verifyAdminAuth(): Promise<AdminAuthResult> {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return {
        isAuthorized: false,
        response: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    // Get user profile to check admin status
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, is_admin')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile) {
      return {
        isAuthorized: false,
        response: NextResponse.json(
          { error: 'Profile not found' },
          { status: 403 }
        )
      }
    }

    // Check if user has admin privileges
    if (!profile.is_admin) {
      return {
        isAuthorized: false,
        response: NextResponse.json(
          { error: 'Admin privileges required' },
          { status: 403 }
        )
      }
    }

    return {
      isAuthorized: true,
      user: session.user,
      profile
    }
  } catch (error) {
    console.error('Admin auth verification error:', error)
    return {
      isAuthorized: false,
      response: NextResponse.json(
        { error: 'Authentication verification failed' },
        { status: 500 }
      )
    }
  }
}