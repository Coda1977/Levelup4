'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function Navigation() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, profile, signOut, isAdmin, isLoading } = useAuth()

  // Determine which section we're in
  const isLearn = pathname.startsWith('/learn')
  const isAICoach = pathname.startsWith('/chat')
  const isAdminPage = pathname.startsWith('/admin')
  
  return (
    <nav style={{backgroundColor: 'var(--white)'}} className="shadow-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-5 md:px-10 py-6 flex justify-between items-center">
        <Link href="/" className="flex items-baseline text-2xl md:text-3xl font-black tracking-tight" style={{color: 'var(--text-primary)'}}>
          Level
          <span className="relative -top-1 ml-1" style={{fontSize: '0.8em'}}>Up</span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          {user && (
            <>
              <Link
                href="/learn"
                className={isLearn ? "nav-ai-coach" : "nav-link"}
                style={isLearn ? {} : {fontWeight: 500, color: 'var(--text-secondary)'}}
              >
                Learn
              </Link>
              <Link
                href="/chat"
                className={isAICoach ? "nav-ai-coach" : "nav-link"}
                style={isAICoach ? {} : {fontWeight: 500, color: 'var(--text-secondary)'}}
              >
                AI Coach
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={pathname.startsWith('/admin') ? "nav-ai-coach" : "nav-admin"}
                  style={pathname.startsWith('/admin') ? {} : undefined}
                >
                  Admin
                </Link>
              )}
            </>
          )}

          {/* Auth Section */}
          {!isLoading && (
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                      style={{
                        backgroundColor: 'var(--accent-blue)',
                        fontFamily: 'var(--font-heading)'
                      }}
                    >
                      {profile?.firstName && profile?.lastName
                        ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
                        : user.email?.split('@')[0].slice(0, 2).toUpperCase() || 'U'}
                    </div>
                    <button
                      onClick={signOut}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-red-600 border border-red-500"
                      style={{
                        backgroundColor: '#ef4444',
                        color: 'white'
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--accent-blue)',
                    color: 'var(--white)'
                  }}
                >
                  Sign In
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
          aria-expanded="false"
        >
          <span className="sr-only">Open main menu</span>
          {!isMobileMenuOpen ? (
            <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          ) : (
            <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3" style={{backgroundColor: 'var(--white)', borderTop: '1px solid #e5e7eb'}}>
            {user ? (
              <>
                <Link
                  href="/learn"
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isLearn
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Learn
                </Link>
                <Link
                  href="/chat"
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isAICoach
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  AI Coach
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      pathname.startsWith('/admin')
                        ? 'bg-red-100 text-red-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="px-3 py-2 text-sm text-gray-600">
                    {user.email}
                  </div>
                  <button
                    onClick={() => {
                      signOut()
                      setIsMobileMenuOpen(false)
                    }}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="block px-3 py-2 rounded-md text-base font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}