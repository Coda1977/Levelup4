'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { createBrowserClientInstance } from '@/lib/supabase-client'
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
  const [supabase, setSupabase] = useState<any>(null)

  useEffect(() => {
    // Only initialize client after component mounts (browser environment)
    if (typeof window === 'undefined') {
      return
    }

    try {
      const client = createBrowserClientInstance()
      setSupabase(client)
    } catch (error) {
      setIsLoading(false)
      return
    }
  }, [])

  useEffect(() => {
    if (!supabase) return

    let isUnmounted = false

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error) {
          if (!isUnmounted) {
            setIsLoading(false)
          }
          return
        }

        // Initial user check completed

        if (!isUnmounted) {
          setUser(user)
          await checkAdminStatus(user?.id)
          setIsLoading(false)
        }
      } catch (error) {
        if (!isUnmounted) {
          setIsLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      // Auth state change handled

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
  }, [router, supabase])

  const checkAdminStatus = async (userId?: string) => {
    if (!userId || !supabase) {
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
        // No profile data found (normal for new users)
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
      setIsAdmin(false)
      setProfile(null)
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Auth not initialized') }

    const { error, data } = await supabase.auth.signInWithPassword({ email, password })

    if (!error && data.user) {
      // Force page refresh to ensure cookies are set
      router.refresh()
    }

    return { error }
  }

  const signUp = async (email: string, password: string, profile?: { firstName: string; lastName: string }) => {
    if (!supabase) return { error: new Error('Auth not initialized') }

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
    if (!supabase) return

    await supabase.auth.signOut()
    router.push('/')
  }

  const resetPassword = async (email: string) => {
    if (!supabase) return { error: new Error('Auth not initialized') }

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