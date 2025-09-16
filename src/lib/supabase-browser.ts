import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof window === 'undefined') return []
          return document.cookie
            .split(';')
            .filter(Boolean)
            .map(cookie => {
              const [name, ...rest] = cookie.trim().split('=')
              return { name, value: rest.join('=') }
            })
        },
        setAll(cookiesToSet) {
          if (typeof window === 'undefined') return
          cookiesToSet.forEach(({ name, value, options }) => {
            let cookieString = `${name}=${value}`
            if (options?.path) cookieString += `; Path=${options.path}`
            if (options?.maxAge) cookieString += `; Max-Age=${options.maxAge}`
            if (options?.sameSite) cookieString += `; SameSite=${options.sameSite}`
            if (options?.secure) cookieString += `; Secure`

            document.cookie = cookieString
          })
        },
      },
    }
  )
}