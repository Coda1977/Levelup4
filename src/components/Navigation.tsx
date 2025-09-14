'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function Navigation() {
  const pathname = usePathname()
  
  // Determine which section we're in
  const isLearn = pathname.startsWith('/learn')
  const isAICoach = pathname.startsWith('/ai-coach')
  const isAdmin = pathname.startsWith('/admin')
  
  return (
    <nav style={{backgroundColor: 'var(--white)'}} className="shadow-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-5 md:px-10 py-6 flex justify-between items-center">
        <Link href="/" className="flex items-baseline text-2xl md:text-3xl font-black tracking-tight" style={{color: 'var(--text-primary)'}}>
          Level
          <span className="relative -top-1 ml-1" style={{fontSize: '0.8em'}}>Up</span>
        </Link>
        <div className="hidden md:flex items-center space-x-8">
          <Link 
            href="/learn" 
            className={isLearn ? "nav-ai-coach" : "nav-link"}
            style={isLearn ? {} : {fontWeight: 500, color: 'var(--text-secondary)'}}
          >
            Learn
          </Link>
          <Link 
            href="/ai-coach" 
            className={isAICoach ? "nav-ai-coach" : "nav-link"}
            style={isAICoach ? {} : {fontWeight: 500, color: 'var(--text-secondary)'}}
          >
            AI Coach
          </Link>
          <Link 
            href="/admin" 
            className={isAdmin ? "nav-ai-coach" : "nav-admin"}
            style={isAdmin ? {} : undefined}
          >
            Admin
          </Link>
        </div>
      </div>
    </nav>
  )
}