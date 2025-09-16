import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get the user from the server-side session
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    // Get the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    const debugInfo = {
      timestamp: new Date().toISOString(),
      serverSideAuth: {
        user: user ? {
          id: user.id,
          email: user.email,
          confirmed_at: user.confirmed_at,
          last_sign_in_at: user.last_sign_in_at
        } : null,
        userError: userError?.message || null,
        session: session ? {
          user_id: session.user?.id,
          expires_at: session.expires_at,
          token_present: !!session.access_token
        } : null,
        sessionError: sessionError?.message || null
      },
      testDatabaseAccess: null as any
    }

    // Test database access if user is authenticated
    if (user) {
      try {
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('chapter_id')
          .eq('user_id', user.id)
          .limit(3)

        debugInfo.testDatabaseAccess = {
          success: !progressError,
          error: progressError?.message || null,
          recordCount: progressData?.length || 0,
          sampleData: progressData?.slice(0, 2) || []
        }
      } catch (dbError: any) {
        debugInfo.testDatabaseAccess = {
          success: false,
          error: dbError.message,
          recordCount: 0,
          sampleData: []
        }
      }
    }

    return NextResponse.json(debugInfo)
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Server-side auth check failed',
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}