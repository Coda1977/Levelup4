'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

type AuthContextType = {
  user: User | null
  session: Session | null
  profile: { firstName: string; lastName: string } | null
  isLoading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, profile?: { firstName: string; lastName: string }) => Promise<{ error: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isAdmin: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  resetPassword: async () => ({ error: null })
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<{ firstName: string; lastName: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let isUnmounted = false

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting initial session:', error)
          if (!isUnmounted) {
            setIsLoading(false)
          }
          return
        }

        console.log('Initial session check:', {
          hasSession: !!session,
          user: session?.user?.email,
          cookies: document.cookie
        })

        if (!isUnmounted) {
          setSession(session)
          setUser(session?.user ?? null)
          await checkAdminStatus(session?.user?.id)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        if (!isUnmounted) {
          setIsLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', {
        event,
        hasSession: !!session,
        user: session?.user?.email,
        timestamp: new Date().toISOString()
      })

      if (!isUnmounted) {
        setSession(session)
        setUser(session?.user ?? null)
        await checkAdminStatus(session?.user?.id)

        // Force page refresh for auth state changes to ensure cookies sync
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          // Small delay to ensure cookies are set
          setTimeout(() => {
            if (!isUnmounted) {
              router.refresh()
            }
          }, 100)
        }
      }
    })

    return () => {
      isUnmounted = true
      subscription.unsubscribe()
    }
  }, [router])

  const checkAdminStatus = async (userId?: string) => {
    if (!userId) {
      setIsAdmin(false)
      setProfile(null)
      return
    }

    try {
      // Fetch user profile and admin status from user_profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, is_admin')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.log('No profile data found for user (this is normal for new users):', profileError.message)
        setProfile(null)
        setIsAdmin(false)
      } else if (profileData) {
        setProfile({
          firstName: profileData.first_name || '',
          lastName: profileData.last_name || ''
        })
        setIsAdmin(profileData.is_admin || false)
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      setIsAdmin(false)
      setProfile(null)
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('Attempting sign in for:', email)
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    console.log('Sign in result:', { error, user: data?.user?.email })

    if (!error && data.user) {
      // Force page refresh to ensure cookies are set
      router.refresh()
    }

    return { error }
  }

  const signUp = async (email: string, password: string, profile?: { firstName: string; lastName: string }) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: profile ? {
          first_name: profile.firstName,
          last_name: profile.lastName
        } : undefined
      }
    })

    // If signup successful, the auth state listener will handle navigation
    if (!error && data.user) {
      // Force a refresh to ensure cookies are set
      router.refresh()
      return { error: null }
    }

    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    return { error }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isLoading,
      isAdmin,
      signIn,
      signUp,
      signOut,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)