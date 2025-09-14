'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

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
  reading_time: number | null
  podcast_title: string | null
  podcast_url: string | null
  video_title: string | null
  video_url: string | null
  try_this_week: string | null
  categories?: Category
}

export default function CategoryPage() {
  const params = useParams()
  const [category, setCategory] = useState<Category | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      loadCategoryData(params.id as string)
    }
  }, [params.id])

  const loadCategoryData = async (categoryId: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/chapters')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load data')
      }
      
      const foundCategory = data.categories?.find((c: Category) => c.id === categoryId)
      if (!foundCategory) {
        setError('Category not found')
        return
      }
      
      const categoryChapters = data.chapters?.filter((c: Chapter) => c.category_id === categoryId) || []
      
      setCategory(foundCategory)
      setChapters(categoryChapters.sort((a: Chapter, b: Chapter) => a.chapter_number - b.chapter_number))
    } catch (error) {
      console.error('Error loading category:', error)
      setError('Failed to load category')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="py-12 md:py-20 px-5 md:px-10" style={{backgroundColor: 'var(--bg-primary)'}}>
        <div className="max-w-6xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-b-transparent mx-auto mb-4" style={{borderColor: 'var(--accent-yellow)', borderBottomColor: 'transparent'}}></div>
          <p style={{color: 'var(--text-secondary)'}}>Loading category...</p>
        </div>
      </div>
    )
  }

  if (error || !category) {
    return (
      <div className="py-12 md:py-20 px-5 md:px-10" style={{backgroundColor: 'var(--bg-primary)'}}>
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>Category Not Found</h1>
          <p className="mb-8" style={{color: 'var(--text-secondary)'}}>
            {error || 'The requested category could not be found.'}
          </p>
          <a
            href="/learn"
            className="hover-lift px-6 py-3 rounded-full font-semibold transition-all duration-300"
            style={{backgroundColor: 'var(--accent-blue)', color: 'var(--white)'}}
          >
            Back to Learn
          </a>
        </div>
      </div>
    )
  }

  const lessons = chapters.filter(c => c.content_type === 'lesson' || !c.content_type)
  const bookSummaries = chapters.filter(c => c.content_type === 'book_summary')
  const completedCount = 0 // Placeholder for now - could be replaced with real progress tracking

  return (
    <div className="min-h-screen pb-20 md:pb-0" style={{background: 'linear-gradient(180deg, var(--bg-primary) 0%, var(--white) 100%)'}}>
      {/* Breadcrumbs */}
      <nav className="py-4 px-5 md:px-10 border-b border-gray-200" style={{backgroundColor: 'var(--white)'}}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 text-sm">
            <a
              href="/learn"
              className="transition-colors duration-200"
              style={{color: 'var(--text-secondary)'}}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-blue)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              Learn
            </a>
            <span style={{color: 'var(--text-secondary)'}}>→</span>
            <span className="font-semibold" style={{color: 'var(--text-primary)'}}>{category.name}</span>
          </div>
        </div>
      </nav>

      {/* Hero/Header */}
      <section className="py-16 md:py-20 px-5 md:px-10 text-center shadow-lg" style={{backgroundColor: 'rgba(255, 255, 255, 0.9)'}}>
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <a
            href="/learn"
            className="hover-lift mb-6 px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2"
            style={{backgroundColor: 'var(--accent-yellow)', color: 'var(--text-primary)'}}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-blue)'
              e.currentTarget.style.color = 'var(--white)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-yellow)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to All Categories
          </a>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg" style={{backgroundColor: 'var(--accent-blue)'}}>
            <span className="text-3xl font-black" style={{color: 'var(--white)'}}>{category.name.charAt(0)}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight" style={{color: 'var(--text-primary)'}}>{category.name}</h1>
          <p className="mb-6 text-lg md:text-xl max-w-3xl" style={{color: 'var(--text-secondary)'}}>
            {category.description}
          </p>
          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center gap-2">
              {Array.from({ length: chapters.length }, (_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${i < completedCount ? 'scale-110' : ''}`}
                  style={{
                    backgroundColor: i < completedCount ? 'var(--accent-yellow)' : 
                                   i === completedCount ? 'var(--accent-blue)' : '#E5E5E5'
                  }}
                />
              ))}
            </div>
            <span className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>
              {Math.round((completedCount / (chapters.length || 1)) * 100)}% Complete
            </span>
          </div>
        </div>
      </section>

      {/* Lessons & Book Summaries */}
      <section className="max-w-6xl mx-auto px-5 md:px-10 py-12 md:py-16">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Lessons */}
          <div className="flex-1">
            <div className="p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100 mb-8" style={{backgroundColor: 'var(--white)'}}>
              <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-3" style={{color: 'var(--text-primary)'}}>
                <span className="text-2xl">📖</span> Lessons
                <span className="text-lg font-normal" style={{color: 'var(--text-secondary)'}}>({lessons.length})</span>
              </h2>
              {lessons.length === 0 ? (
                <div className="text-lg py-8 text-center" style={{color: 'var(--text-secondary)'}}>
                  No lessons yet for this category.
                </div>
              ) : (
                <div className="grid gap-6">
                  {lessons.map((chapter: Chapter) => (
                    <div
                      key={chapter.id}
                      className="hover-lift p-6 rounded-xl border border-gray-100 cursor-pointer transition-all duration-300"
                      style={{backgroundColor: 'var(--bg-primary)'}}
                      onClick={() => window.location.href = `/learn/${chapter.id}`}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <span className="text-sm px-2 py-1 rounded-full" style={{backgroundColor: 'var(--accent-yellow)', color: 'var(--text-primary)'}}>
                          {chapter.reading_time || Math.ceil(chapter.content.length / 1000)} min read
                        </span>
                      </div>
                      <h4 className="font-bold text-lg mb-2" style={{color: 'var(--text-primary)'}}>{chapter.title}</h4>
                      <p className="text-sm mb-4" style={{color: 'var(--text-secondary)'}}>
                        {chapter.preview}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Book Summaries */}
          <div className="flex-1">
            <div className="p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100 mb-8" style={{backgroundColor: 'var(--white)'}}>
              <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-3" style={{color: 'var(--text-primary)'}}>
                <span className="text-2xl">📚</span> Book Summaries
                <span className="text-lg font-normal" style={{color: 'var(--text-secondary)'}}>({bookSummaries.length})</span>
              </h2>
              {bookSummaries.length === 0 ? (
                <div className="text-lg py-8 text-center" style={{color: 'var(--text-secondary)'}}>
                  No book summaries yet for this category.
                </div>
              ) : (
                <div className="grid gap-6">
                  {bookSummaries.map((book: Chapter) => (
                    <div
                      key={book.id}
                      className="hover-lift p-6 rounded-xl border border-gray-100 cursor-pointer transition-all duration-300"
                      style={{backgroundColor: 'var(--bg-primary)'}}
                      onClick={() => window.location.href = `/learn/${book.id}`}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <span className="text-sm px-2 py-1 rounded-full" style={{backgroundColor: 'var(--accent-blue)', color: 'var(--white)'}}>
                          {book.reading_time || Math.ceil(book.content.length / 1000)} min read
                        </span>
                      </div>
                      <h4 className="font-bold text-lg mb-2" style={{color: 'var(--text-primary)'}}>{book.title}</h4>
                      <p className="text-sm mb-4" style={{color: 'var(--text-secondary)'}}>
                        {book.preview}
                      </p>
                      {/* Audio Player Placeholder */}
                      {book.podcast_url && (
                        <div 
                          className="mt-4 p-3 rounded-lg border-2 border-dashed border-gray-300"
                          style={{backgroundColor: '#F8F8F8'}}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🎧</span>
                            <span className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>
                              {book.podcast_title || 'Audio Version Available'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}