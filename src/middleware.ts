import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protected routes that require authentication
  const protectedPaths = ['/learn', '/chat', '/admin']
  const isProtectedPath = protectedPaths.some(path =>
    req.nextUrl.pathname.startsWith(path)
  )

  // Admin-only routes
  const adminPaths = ['/admin']
  const isAdminPath = adminPaths.some(path =>
    req.nextUrl.pathname.startsWith(path)
  )

  // Redirect to login if accessing protected route without session
  if (isProtectedPath && !session) {
    const redirectUrl = new URL('/auth/login', req.url)
    redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Check admin status for admin routes
  if (isAdminPath && session) {
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()

    if (!userData?.is_admin) {
      return NextResponse.redirect(new URL('/learn', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/learn/:path*', '/chat/:path*', '/admin/:path*']
}