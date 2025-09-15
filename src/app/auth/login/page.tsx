'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // For sign up, show a success message about email verification
      if (isSignUp) {
        setError('Please check your email to verify your account before logging in.')
        setLoading(false)
        setIsSignUp(false) // Switch back to login mode
      } else {
        router.push('/learn')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md">
        <div className="p-8 rounded-lg shadow-lg" style={{ backgroundColor: 'var(--white)' }}>
          <h1 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--text-primary)' }}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: 'var(--border-color)' }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: 'var(--border-color)' }}
                placeholder="••••••••"
              />
              {isSignUp && (
                <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Password must be at least 6 characters
                </p>
              )}
            </div>

            {error && (
              <div className={`p-3 rounded-lg text-sm ${error.includes('check your email') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold transition-all duration-200 hover:shadow-md disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent-blue)',
                color: 'var(--white)'
              }}
            >
              {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
              }}
              className="text-sm hover:underline"
              style={{ color: 'var(--accent-blue)' }}
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>

          <div className="mt-4 text-center">
            <Link href="/" className="text-sm hover:underline" style={{ color: 'var(--text-secondary)' }}>
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}