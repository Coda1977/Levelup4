'use client'

import { useState, useEffect } from 'react'

type Category = {
  id: string
  name: string
  description: string
  sort_order: number
}

type Chapter = {
  id: string
  category_id: string
  title: string
  content: string
  preview: string
  sort_order: number
  chapter_number: number
  content_type: string
  categories?: Category
}

export default function LearnPage() {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/chapters')
      const data = await response.json()
      
      if (response.ok) {
        setCategories(data.categories || [])
        setChapters(data.chapters || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPersonalizedGreeting = () => {
    const hour = new Date().getHours()
    const name = 'there' // Placeholder name
    
    if (hour < 12) {
      return `Good morning, ${name}!`
    } else if (hour < 17) {
      return `Good afternoon, ${name}!`
    } else {
      return `Good evening, ${name}!`
    }
  }

  // Calculate progress stats
  const totalChapters = chapters.length
  const completedChapters = 0 // Placeholder for now
  const completedThisWeek = 0 // Placeholder for now

  const getActivityMessage = () => {
    if (completedThisWeek > 0) {
      return `You've completed ${completedThisWeek} chapter${completedThisWeek > 1 ? 's' : ''} this week!`
    } else if (completedChapters > 0) {
      return "Ready to continue your learning journey?"
    } else if (completedChapters === totalChapters) {
      return "Congratulations! You've completed all available content."
    } else {
      return "Ready to start building your management skills?"
    }
  }

  // Group chapters by category with progress
  const categoriesWithChapters = categories.map((category: Category) => {
    const categoryChapters = chapters
      .filter((c: Chapter) => c.category_id === category.id)
      .sort((a: Chapter, b: Chapter) => a.chapter_number - b.chapter_number)

    // Separate lessons and book summaries
    const lessons = categoryChapters.filter((c: Chapter) => c.content_type === 'lesson' || !c.content_type)
    const bookSummaries = categoryChapters.filter((c: Chapter) => c.content_type === 'book_summary')
    
    return {
      ...category,
      lessons,
      bookSummaries,
      chapters: categoryChapters,
      progress: 0, // Placeholder
      total: categoryChapters.length,
    }
  })

  // Mock recent chapters for "Continue Learning"
  const recentChapters = chapters.slice(0, 2)

  if (loading) {
    return (
      <div className="py-12 md:py-20 px-5 md:px-10">
        <div className="max-w-6xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-b-transparent mx-auto mb-4" style={{borderColor: 'var(--accent-yellow)', borderBottomColor: 'transparent'}}></div>
          <p style={{color: 'var(--text-secondary)'}}>Loading...</p>
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
              <p className="text-lg md:text-xl mb-2" style={{color: 'var(--text-secondary)'}}>{getPersonalizedGreeting()}</p>
              <h1 className="text-[clamp(32px,5vw,48px)] font-black tracking-tight leading-tight mb-6" style={{color: 'var(--text-primary)'}}>Your Learning Journey</h1>
              <p className="text-lg max-w-md mb-8" style={{color: 'var(--text-secondary)'}}>
                {getActivityMessage()}
              </p>
              
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => window.location.href = chapters.length > 0 ? `/learn/${chapters[0].id}` : '/learn'}
                  className="hover-lift px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2"
                  style={{backgroundColor: 'var(--accent-blue)', color: 'var(--white)'}}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {completedChapters > 0 ? 'Continue Learning' : 'Start Learning'}
                </button>
                <button 
                  onClick={() => window.location.href = '/ai-coach'}
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
                <div className="w-full h-3 bg-gray-200 rounded-full">
                  <div 
                    className="h-3 rounded-full transition-all duration-500" 
                    style={{
                      backgroundColor: 'var(--accent-yellow)',
                      width: `${totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0}%`
                    }}
                  ></div>
                </div>
              </div>
              <p className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                {chapters.length > 0 ? `Next: ${chapters[0].title}` : 'No chapters available'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Continue Learning Section */}
      {recentChapters.length > 0 && (
        <section className="py-12 md:py-16 px-5 md:px-10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="section-header mb-4" style={{color: 'var(--text-primary)'}}>Continue Your Journey</h2>
              <p className="text-lg max-w-2xl mx-auto" style={{color: 'var(--text-secondary)'}}>
                Pick up where you left off
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12">
              {recentChapters.map((chapter: Chapter) => (
                <div
                  key={chapter.id}
                  className="hover-lift p-8 rounded-2xl shadow-lg transition-all duration-300 cursor-pointer"
                  style={{backgroundColor: 'var(--white)'}}
                  onClick={() => window.location.href = `/learn/${chapter.id}`}
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 border-4 rounded-2xl flex items-center justify-center flex-shrink-0" style={{backgroundColor: 'var(--white)', borderColor: 'var(--text-primary)'}}>
                      <div className="w-6 h-6 rounded-full" style={{backgroundColor: 'var(--text-primary)'}}></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{chapter.title}</h3>
                      <p className="text-sm mb-3" style={{color: 'var(--text-secondary)'}}>
                        {categories.find((c: Category) => c.id === chapter.category_id)?.name}
                      </p>
                      <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                        Pick up where you left off in this management essential
                      </p>
                    </div>
                    <div className="px-4 py-2 rounded-full text-sm font-semibold" style={{backgroundColor: 'var(--accent-yellow)'}}>
                      Continue
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Overall Progress Overview */}
      <section className="py-12 px-5 md:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="p-8 md:p-12 rounded-2xl shadow-lg border border-gray-100" style={{backgroundColor: 'var(--white)'}}>
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>
                Progress Overview
              </h2>
              <div className="flex items-center justify-center gap-8 flex-wrap">
                {categoriesWithChapters.map((category) => {
                  const percentage = Math.round((category.progress / (category.total || 1)) * 100)
                  return (
                    <div key={category.id} className="text-center">
                      <div className="text-3xl font-black mb-2" style={{color: 'var(--accent-blue)'}}>
                        {percentage}%
                      </div>
                      <div className="text-sm font-semibold" style={{color: 'var(--text-secondary)'}}>
                        {category.name}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Categories */}
      <section className="py-12 md:py-20 px-5 md:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="section-header mb-6" style={{color: 'var(--text-primary)'}}>
              Explore All Topics
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{color: 'var(--text-secondary)'}}>
              Master the essential skills of effective management through curated lessons and insights from top business books.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categoriesWithChapters.map((category) => (
              <div
                key={category.id}
                className="hover-lift p-8 md:p-12 rounded-2xl shadow-lg transition-all duration-300 cursor-pointer"
                style={{backgroundColor: 'var(--white)'}}
                onClick={() => window.location.href = `/learn/category/${category.id}`}
              >
                <div className="mb-6">
                  <div className="text-4xl font-black mb-4" style={{color: 'var(--accent-yellow)'}}>
                    {category.sort_order < 10 ? `0${category.sort_order}` : category.sort_order}
                  </div>
                  <h3 className="text-2xl font-bold mb-3" style={{color: 'var(--text-primary)'}}>
                    {category.name}
                  </h3>
                  <p className="mb-6" style={{color: 'var(--text-secondary)'}}>
                    {category.description}
                  </p>
                </div>
                
                <div className="mb-6">
                  <div className="text-sm mb-2" style={{color: 'var(--text-secondary)'}}>
                    Progress: {category.progress} of {category.total} complete
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-2 rounded-full transition-all duration-500" 
                      style={{
                        backgroundColor: 'var(--accent-yellow)',
                        width: `${category.total > 0 ? (category.progress / category.total) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  {category.lessons.slice(0, 3).map((lesson, index) => (
                    <div key={lesson.id} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{backgroundColor: 'var(--accent-yellow)'}}></div>
                      <span className="text-sm" style={{color: 'var(--text-secondary)'}}>{lesson.title}</span>
                    </div>
                  ))}
                  {category.lessons.length > 3 && (
                    <div className="text-xs font-medium" style={{color: 'var(--accent-blue)'}}>
                      +{category.lessons.length - 3} more chapters
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}