// Single, simple Supabase client factory
// This replaces supabase.ts, supabase-browser.ts, and supabase-server.ts

import { createServerClient as createSSRClient } from '@supabase/ssr'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server-side client (for API routes and server components)
export async function createClient() {
  if (typeof window !== 'undefined') {
    // Browser environment - simple client
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  }

  // Server environment - handle cookies
  // Dynamic import to avoid issues in client components
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createSSRClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Cookies can only be set in route handlers and server actions
        }
      },
    },
  })
}

// Admin client for operations that bypass RLS (only when absolutely needed)
export function createAdminClient() {
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRole) {
    throw new Error('Service role key not configured')
  }

  return createSSRClient(supabaseUrl, serviceRole, {
    cookies: {
      getAll() { return [] },
      setAll() { /* Admin client doesn't need cookies */ }
    },
  })
}