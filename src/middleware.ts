import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  // This will refresh session if expired - required for Server Components
  const { data: { session } } = await supabase.auth.getSession()

  console.log('Middleware check:', {
    path: request.nextUrl.pathname,
    hasSession: !!session,
    user: session?.user?.email,
    cookies: request.cookies.getAll().map(c => c.name)
  })

  // Ensure user profile exists if authenticated (trigger handles initial creation, this is a safety net)
  if (session?.user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', session.user.id)
      .single()

    if (!profile) {
      // Create profile if missing (should be rare due to trigger)
      await supabase.from('user_profiles').insert({
        id: session.user.id,
        first_name: session.user.user_metadata?.first_name || '',
        last_name: session.user.user_metadata?.last_name || '',
        is_admin: false
      })
      // Created missing profile
    }
  }

  // Protected routes
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/learn') ||
                          request.nextUrl.pathname.startsWith('/chat') ||
                          request.nextUrl.pathname.startsWith('/admin')

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !session) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/auth/login'
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Check admin privileges for admin routes
  if (isAdminRoute && session) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()

    if (!profile?.is_admin) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/learn'
      redirectUrl.searchParams.set('error', 'admin_required')
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/learn/:path*',
    '/chat/:path*',
    '/admin/:path*'
  ]
}