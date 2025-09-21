'use client'

import { useEffect, useState } from 'react'
import { useData } from '@/contexts/DataContext'
import { Chapter, Category } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

export default function LearnPage() {
  const {
    chapters,
    categories,
    chaptersLoading,
    categoriesLoading,
    fetchChaptersAndCategories
  } = useData()

  const { user, profile } = useAuth()
  const supabase = createClient()
  const router = useRouter()
  const loading = chaptersLoading || categoriesLoading

  // State for dynamic content that causes hydration issues
  const [greeting, setGreeting] = useState('Welcome!')
  const [activityMessage, setActivityMessage] = useState('Loading your progress...')
  const [completedChapterIds, setCompletedChapterIds] = useState<string[]>([])
  const [progressLoading, setProgressLoading] = useState(true)

  useEffect(() => {
    fetchChaptersAndCategories()
  }, [fetchChaptersAndCategories])

  // Fetch user progress
  const fetchUserProgress = async () => {
    try {
      const response = await fetch('/api/progress', {
        credentials: 'include',
      })

      if (response.ok) {
        const { progress } = await response.json()
        const chapterIds = progress.map((item: any) => item.chapter_id)
        setCompletedChapterIds(chapterIds)
        console.log('Fetched completed chapters:', chapterIds)
      } else if (response.status === 401) {
        console.log('User not authenticated')
        setCompletedChapterIds([])
      } else {
        console.error('Failed to fetch progress:', response.statusText)
        setCompletedChapterIds([])
      }
    } catch (error) {
      console.error('Error fetching progress:', error)
      setCompletedChapterIds([])
    }

    setProgressLoading(false)
  }

  useEffect(() => {
    fetchUserProgress()
  }, [user])

  // Refetch progress when page gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchUserProgress()
      }
    }

    window.addEventListener('focus', handleFocus)

    // Also listen for visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        fetchUserProgress()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])

  // Only set dynamic content after mount to avoid hydration mismatch
  useEffect(() => {
    // Calculate greeting based on time and user
    const hour = new Date().getHours()
    // Use real name from profile, fallback to email, then to 'there'
    const emailPart = user?.email?.split('@')[0]
    const firstName = profile?.firstName ||
                      (emailPart ? emailPart.charAt(0).toUpperCase() + emailPart.slice(1) : 'there')

    let newGreeting
    if (hour < 5) {
      newGreeting = `Hey ${firstName}, burning the midnight oil?`
    } else if (hour < 12) {
      newGreeting = `Good morning, ${firstName}!`
    } else if (hour < 17) {
      newGreeting = `Good afternoon, ${firstName}!`
    } else if (hour < 21) {
      newGreeting = `Good evening, ${firstName}!`
    } else {
      newGreeting = `Hey ${firstName}, working late?`
    }
    setGreeting(newGreeting)

    // Set activity message based on real progress
    const completedChapters = completedChapterIds.length
    const totalChapters = chapters.length

    let newActivityMessage
    if (completedChapters === totalChapters && totalChapters > 0) {
      newActivityMessage = "Congratulations! You've completed all available content."
    } else if (completedChapters > 0) {
      newActivityMessage = `You've completed ${completedChapters} out of ${totalChapters} chapters. Keep going!`
    } else {
      newActivityMessage = "Welcome to your management training platform. Let's build your leadership skills together."
    }
    setActivityMessage(newActivityMessage)
  }, [user, profile, chapters.length, completedChapterIds])

  // Calculate progress stats
  const totalChapters = chapters.length
  const completedChapters = completedChapterIds.length

  // Group chapters by category with progress
  const categoriesWithChapters = categories.map((category: Category) => {
    const categoryChapters = chapters
      .filter((chapter: Chapter) => chapter.category_id === category.id)
      .sort((a: Chapter, b: Chapter) => a.sort_order - b.sort_order)

    const completedCount = categoryChapters.filter(ch => completedChapterIds.includes(ch.id)).length

    return {
      ...category,
      chapters: categoryChapters,
      completedCount,
      totalCount: categoryChapters.length
    }
  }).filter(cat => cat.chapters.length > 0)

  // Get uncompleted chapters for continue learning section
  const uncompletedChapters = chapters.filter(ch => !completedChapterIds.includes(ch.id))
  const recentChapters = uncompletedChapters.slice(0, 2)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--bg-primary)'}}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>Loading your content...</h2>
          <p style={{color: 'var(--text-secondary)'}}>Setting up your personalized learning experience</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-20 md:pb-0" style={{backgroundColor: 'var(--bg-primary)'}}>
      {/* Personalized Welcome Section */}
      <section className="py-16 md:py-20 px-5 md:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 md:gap-12 items-start">
            <div className="flex-1">
              <p className="text-lg md:text-xl mb-2" style={{color: 'var(--text-secondary)'}}>
                {greeting}
              </p>
              <h1 className="text-[clamp(32px,5vw,48px)] font-black tracking-tight leading-tight mb-6" style={{color: 'var(--text-primary)'}}>
                {completedChapters > 0 ? 'Your Learning Journey' : 'Start Your Journey'}
              </h1>
              <p className="text-lg max-w-md mb-8" style={{color: 'var(--text-secondary)'}}>
                {activityMessage}
              </p>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => router.push(uncompletedChapters.length > 0 ? `/learn/${uncompletedChapters[0].id}` : chapters.length > 0 ? `/learn/${chapters[0].id}` : '/learn')}
                  className="hover-lift px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2"
                  style={{backgroundColor: 'var(--accent-blue)', color: 'var(--white)'}}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {completedChapters > 0 ? 'Continue Learning' : 'Start Learning'}
                </button>
                <button
                  onClick={() => router.push('/chat')}
                  className="ai-coach-button px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Ask AI Coach
                </button>
              </div>
            </div>
            <div className="flex-1 max-w-md p-6 md:p-8 rounded-2xl shadow-lg" style={{backgroundColor: 'var(--white)'}}>
              <h3 className="text-lg md:text-xl font-bold mb-3">Your Progress</h3>
              <p className="text-base mb-6" style={{color: 'var(--text-secondary)'}}>
                You've completed {completedChapters} out of {totalChapters} chapters
              </p>
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2" style={{color: 'var(--text-secondary)'}}>
                  <span>Progress</span>
                  <span>{completedChapters} of {totalChapters}</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{backgroundColor: 'var(--border-color)'}}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      backgroundColor: 'var(--accent-blue)',
                      width: `${totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0}%`
                    }}
                  ></div>
                </div>
              </div>
              <p className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                {uncompletedChapters.length > 0 ? `Next: ${uncompletedChapters[0].title}` : 'All chapters completed!'}
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* All Chapters by Category */}
      <section className="py-12 md:py-16 px-5 md:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="section-header mb-4" style={{color: 'var(--text-primary)'}}>All Chapters</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{color: 'var(--text-secondary)'}}>
              Explore our comprehensive management training curriculum
            </p>
          </div>

          <div className="space-y-6 md:space-y-8">
            {categoriesWithChapters.map((category) => (
              <div key={category.id} className="p-6 md:p-8 rounded-2xl shadow-lg" style={{backgroundColor: 'var(--white)'}}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl md:text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{category.name}</h3>
                  <span className="text-sm font-medium px-3 py-1 rounded-full" style={{backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)'}}>
                    {category.completedCount} / {category.totalCount} completed
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                  {category.chapters.map((chapter: Chapter) => {
                    const isChapterCompleted = completedChapterIds.includes(chapter.id)
                    return (
                      <div
                        key={chapter.id}
                        className="p-6 rounded-xl hover-lift transition-all duration-200 cursor-pointer relative"
                        style={{
                          backgroundColor: isChapterCompleted ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-primary)',
                          border: isChapterCompleted ? '2px solid rgba(16, 185, 129, 0.3)' : 'none'
                        }}
                        onClick={() => router.push(`/learn/${chapter.id}`)}
                      >
                        {isChapterCompleted && (
                          <div className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center" style={{backgroundColor: '#10b981'}}>
                            <span className="text-white text-sm font-bold">✓</span>
                          </div>
                        )}
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold mb-2" style={{color: 'var(--text-primary)'}}>{chapter.title}</h4>
                            <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                              {isChapterCompleted ? 'Completed' : 'Ready to explore'}
                            </p>
                          </div>
                          <svg className="w-5 h-5 ml-2" style={{color: isChapterCompleted ? '#10b981' : 'var(--accent-blue)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}