'use client'

import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-client'
import { useState, useEffect } from 'react'

export default function AuthDebug() {
  const { user, session, isLoading } = useAuth()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setIsClient(true)
  }, [])

  const runFullDebug = async () => {
    console.log('Running full auth debug...')

    const debug = {
      timestamp: new Date().toISOString(),
      authContext: {
        user: user ? {
          id: user.id,
          email: user.email,
          confirmed_at: user.confirmed_at,
          last_sign_in_at: user.last_sign_in_at
        } : null,
        session: session ? {
          access_token: session.access_token ? 'present' : 'missing',
          refresh_token: session.refresh_token ? 'present' : 'missing',
          expires_at: session.expires_at,
          expires_in: session.expires_in
        } : null,
        isLoading
      },
      cookies: typeof window !== 'undefined' ? document.cookie : 'SSR - no cookies available',
      supabaseSession: null as any,
      testQuery: null as any,
      serverSideAuth: null as any
    }

    try {
      // Test direct Supabase session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      debug.supabaseSession = {
        data: sessionData?.session ? {
          user_id: sessionData.session.user?.id,
          user_email: sessionData.session.user?.email,
          expires_at: sessionData.session.expires_at
        } : null,
        error: sessionError?.message || null
      }

      // Test a simple database query
      if (user) {
        const { data: testData, error: testError } = await supabase
          .from('user_progress')
          .select('chapter_id')
          .eq('user_id', user.id)
          .limit(1)

        debug.testQuery = {
          success: !testError,
          error: testError?.message || null,
          dataCount: testData?.length || 0
        }
      }
    } catch (error: any) {
      debug.testQuery = {
        success: false,
        error: error.message,
        dataCount: 0
      }
    }

    // Test server-side auth
    try {
      const response = await fetch('/api/debug-auth', {
        method: 'GET',
        credentials: 'include'
      })

      if (response.ok) {
        debug.serverSideAuth = await response.json()
      } else {
        debug.serverSideAuth = {
          error: `HTTP ${response.status}: ${response.statusText}`
        }
      }
    } catch (error: any) {
      debug.serverSideAuth = {
        error: `Fetch failed: ${error.message}`
      }
    }

    setDebugInfo(debug)
    console.log('Auth debug complete:', debug)
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Auth Debug Information</h2>

      <div className="mb-4">
        <button
          onClick={runFullDebug}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Run Full Debug Check
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-bold mb-2 text-gray-700">Auth Context Status</h3>
            <div className="space-y-1 text-gray-600">
              <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
              <div>User: {user ? `${user.email} (${user.id})` : 'None'}</div>
              <div>Session: {session ? 'Present' : 'None'}</div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-bold mb-2 text-gray-700">Browser Cookies</h3>
            <div className="text-gray-600 text-xs font-mono break-all">
              {isClient ? (document.cookie || 'No cookies found') : 'Loading...'}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {debugInfo && (
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-bold mb-2 text-gray-700">Debug Results</h3>
              <pre className="text-xs text-gray-600 overflow-auto max-h-96 bg-white p-2 rounded border">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 rounded border-l-4 border-yellow-400">
        <h4 className="font-bold text-yellow-800">Expected Behavior:</h4>
        <ul className="list-disc list-inside text-yellow-700 text-sm mt-2 space-y-1">
          <li>User and session should both be present when logged in</li>
          <li>Cookies should contain supabase auth tokens</li>
          <li>Direct Supabase session should match auth context</li>
          <li>Test query should succeed if properly authenticated</li>
        </ul>
      </div>
    </div>
  )
}