import { createBrowserClient } from '@supabase/ssr'
import { Session } from '@supabase/supabase-js'

let cachedSession: Session | null = null
let sessionPromise: Promise<Session | null> | null = null

// Fetch session from server (which has access to HTTP-only cookies)
async function fetchServerSession(): Promise<Session | null> {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include',
    })

    if (!response.ok) {
      console.error('Failed to fetch session:', response.statusText)
      return null
    }

    const data = await response.json()
    return data.session
  } catch (error) {
    console.error('Error fetching session:', error)
    return null
  }
}

// Create a Supabase client that uses the server session
export function createAuthenticatedClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Override the auth methods to use server session
  const originalGetSession = client.auth.getSession.bind(client.auth)

  client.auth.getSession = async () => {
    // If we don't have a cached session or promise, fetch from server
    if (!cachedSession && !sessionPromise) {
      sessionPromise = fetchServerSession()
      cachedSession = await sessionPromise
      sessionPromise = null
    }

    // If we have a cached session, validate it's not expired
    if (cachedSession) {
      const expiresAt = cachedSession.expires_at
      const now = Math.floor(Date.now() / 1000)

      if (expiresAt && now > expiresAt) {
        // Session expired, fetch new one
        cachedSession = await fetchServerSession()
      }
    }

    // Set the session in the client if we have one
    if (cachedSession) {
      await client.auth.setSession({
        access_token: cachedSession.access_token,
        refresh_token: cachedSession.refresh_token,
      })
    }

    return { data: { session: cachedSession }, error: null }
  }

  return client
}

// Clear cached session (call on logout)
export function clearSessionCache() {
  cachedSession = null
  sessionPromise = null
}