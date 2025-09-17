'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ChapterAudioPlayer from '@/components/ChapterAudioPlayer'
import { sanitizeHtml } from '@/lib/sanitize'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-client'

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
  author: string | null
  description: string | null
  key_takeaways: string[] | null
  podcast_header: string | null
  video_header: string | null
  audio_url?: string | null
  audio_voice?: string | null
  audio_generated_at?: string | null
  categories?: Category
}

export default function ChapterPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [allChapters, setAllChapters] = useState<Chapter[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [readingProgress, setReadingProgress] = useState(0)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [completingChapter, setCompletingChapter] = useState(false)

  useEffect(() => {
    if (params.id) {
      loadChapter(params.id as string)
      if (user) {
        checkChapterCompletion(params.id as string)
      }
    }
  }, [params.id, user])

  const loadChapter = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/chapters')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load chapter')
      }
      
      const foundChapter = data.chapters?.find((c: Chapter) => c.id === id)
      if (!foundChapter) {
        setError('Chapter not found')
        return
      }
      
      setChapter(foundChapter)
      setAllChapters(data.chapters || [])
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Error loading chapter:', error)
      setError('Failed to load chapter')
    } finally {
      setLoading(false)
    }
  }

  const checkChapterCompletion = async (chapterId: string) => {
    try {
      const response = await fetch('/api/progress', {
        credentials: 'include',
      })

      if (response.ok) {
        const { progress } = await response.json()
        const isComplete = progress.some((p: any) => p.chapter_id === chapterId)
        setIsCompleted(isComplete)
        console.log('Chapter completion status:', { chapterId, isComplete })
      }
    } catch (error) {
      console.error('Error checking completion:', error)
    }
  }

  const markChapterComplete = async () => {
    if (!chapter || completingChapter) return

    setCompletingChapter(true)

    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ chapterId: chapter.id }),
      })

      if (response.ok) {
        setIsCompleted(true)
        console.log('Chapter marked as complete')
      } else {
        const error = await response.text()
        console.error('Failed to mark chapter complete:', error)
      }
    } catch (error) {
      console.error('Error marking complete:', error)
    }

    setCompletingChapter(false)
  }

  const calculateReadingTime = (content: string) => {
    return Math.ceil(content.length / 1000)
  }

  const handleScroll = () => {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    const progress = Math.min((scrollTop / docHeight) * 100, 100)
    setReadingProgress(progress)
    
    // Calculate estimated time remaining
    const totalTime = chapter?.reading_time || calculateReadingTime(chapter?.content || '')
    const timeRemaining = Math.max(0, Math.ceil(totalTime * (1 - progress / 100)))
    setEstimatedTimeRemaining(timeRemaining)
  }

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    handleScroll() // Initial calculation
    return () => window.removeEventListener('scroll', handleScroll)
  }, [chapter])

  const extractYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }

  const getPodcastEmbedInfo = (url: string) => {
    // Spotify
    if (url.includes('spotify.com/episode/')) {
      const episodeId = url.match(/episode\/([a-zA-Z0-9]+)/)?.[1]
      return {
        type: 'spotify',
        embedUrl: `https://open.spotify.com/embed/episode/${episodeId}?utm_source=generator&theme=0`,
        canEmbed: !!episodeId
      }
    }
    
    if (url.includes('spotify.com/show/')) {
      const showId = url.match(/show\/([a-zA-Z0-9]+)/)?.[1]
      return {
        type: 'spotify',
        embedUrl: `https://open.spotify.com/embed/show/${showId}?utm_source=generator&theme=0`,
        canEmbed: !!showId
      }
    }
    
    if (url.includes('spotify.com/track/')) {
      const trackId = url.match(/track\/([a-zA-Z0-9]+)/)?.[1]
      return {
        type: 'spotify',
        embedUrl: `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`,
        canEmbed: !!trackId
      }
    }
    
    // SoundCloud
    if (url.includes('soundcloud.com')) {
      return {
        type: 'soundcloud',
        embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`,
        canEmbed: true
      }
    }
    
    // Anchor.fm
    if (url.includes('anchor.fm')) {
      const match = url.match(/anchor\.fm\/([^/]+)\/episodes\/([^/]+)/)
      if (match) {
        const [, showName, episodeName] = match
        return {
          type: 'anchor',
          embedUrl: `https://anchor.fm/${showName}/embed/episodes/${episodeName}`,
          canEmbed: true
        }
      }
    }
    
    // Direct audio files
    if (url.match(/\.(mp3|wav|m4a|ogg)($|\?)/)) {
      return {
        type: 'audio',
        embedUrl: url,
        canEmbed: true
      }
    }
    
    return {
      type: 'external',
      embedUrl: url,
      canEmbed: false
    }
  }

  const cleanMarkdown = (text: string) => {
    return text
      // Remove bold markdown (do this first to avoid conflicts)
      .replace(/\*\*(.*?)\*\*/g, '$1')
      // Remove italic markdown (only single asterisks that aren't part of bold)
      .replace(/(?<!\*)\*(?!\*)(.*?)\*(?!\*)/g, '$1')
      // Remove inline code
      .replace(/`([^`]*)`/g, '$1')
      // Remove underscores used for emphasis
      .replace(/__(.*?)__/g, '$1')
      .replace(/(?<!_)_(?!_)(.*?)_(?!_)/g, '$1')
      // Clean up any remaining markdown artifacts
      .replace(/[~`]/g, '')
      .trim()
  }

  const formatContent = (content: string) => {
    // More robust HTML detection - check for common HTML tags anywhere in content
    const htmlTagPattern = /<(p|h[1-6]|div|span|strong|em|ul|ol|li|blockquote|br|hr|a|img)[^>]*>/i
    const isHTML = htmlTagPattern.test(content)
    
    // If it's HTML, render it directly with proper styling
    if (isHTML) {
      return (
        <div 
          className="chapter-html-content"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
        />
      )
    }
    
    // Otherwise, parse as markdown (legacy support)
    const cleanContent = content.replace(/^## Topic \d+: [^\n]+\n\n/, '')
    const sections = cleanContent.split('\n\n')
    
    return sections.map((paragraph, index) => {
      const trimmed = paragraph.trim()
      
      // Handle headers
      if (trimmed.startsWith('## ')) {
        return (
          <React.Fragment key={index}>
            {index > 0 && <div className="section-divider" />}
            <h2>
              {cleanMarkdown(trimmed.replace('## ', '').trim())}
            </h2>
          </React.Fragment>
        )
      }
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={index}>
            {cleanMarkdown(trimmed.replace('### ', '').trim())}
          </h3>
        )
      }
      
      // Handle blockquotes
      if (trimmed.startsWith('> ')) {
        return (
          <blockquote key={index}>
            {cleanMarkdown(trimmed.replace(/^> /gm, '').trim())}
          </blockquote>
        )
      }
      
      // Handle unordered lists
      if (trimmed.includes('\n- ') || trimmed.startsWith('- ')) {
        const items = trimmed.split('\n').filter(line => line.trim().startsWith('- '))
        return (
          <ul key={index}>
            {items.map((item, itemIndex) => (
              <li key={itemIndex}>{cleanMarkdown(item.replace('- ', '').trim())}</li>
            ))}
          </ul>
        )
      }
      
      // Handle ordered lists
      if (/^\d+\. /.test(trimmed) || trimmed.includes('\n1. ')) {
        const items = trimmed.split('\n').filter(line => /^\d+\. /.test(line.trim()))
        return (
          <ol key={index}>
            {items.map((item, itemIndex) => (
              <li key={itemIndex}>{cleanMarkdown(item.replace(/^\d+\. /, '').trim())}</li>
            ))}
          </ol>
        )
      }
      
      // Handle regular paragraphs
      if (trimmed) {
        return (
          <p key={index}>
            {cleanMarkdown(trimmed)}
          </p>
        )
      }
      
      return null
    }).filter(Boolean)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-2xl font-bold" style={{color: 'var(--text-secondary)'}}>
        Loading chapter...
      </div>
    )
  }

  if (error || !chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center text-2xl font-bold" style={{color: 'var(--text-secondary)'}}>
        Chapter not found
      </div>
    )
  }

  const category = categories.find(c => c.id === chapter.category_id)
  const readingTime = chapter.reading_time || calculateReadingTime(chapter.content)

  return (
    <div className="min-h-screen pb-20 md:pb-0" style={{background: 'linear-gradient(180deg, var(--bg-primary) 0%, white 100%)'}}>
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-50" style={{backgroundColor: 'rgba(0, 53, 102, 0.1)'}}>
        <div 
          className="h-full transition-all duration-300 ease-out" 
          style={{
            width: `${readingProgress}%`,
            backgroundColor: 'var(--accent-blue)',
            boxShadow: readingProgress > 0 ? '0 0 10px rgba(0, 53, 102, 0.5)' : 'none'
          }}
        />
      </div>

      {/* Reading Time Indicator */}
      {readingProgress > 5 && readingProgress < 95 && (
        <div className="fixed bottom-6 right-6 z-40 px-4 py-2 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300" style={{backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '1px solid var(--accent-yellow)'}}>
          <div className="flex items-center gap-2 text-sm font-medium" style={{color: 'var(--text-primary)'}}>
            <div className="w-3 h-3 rounded-full" style={{backgroundColor: 'var(--accent-blue)'}} />
            <span>{estimatedTimeRemaining} min remaining</span>
          </div>
        </div>
      )}

      {/* Header */}
      <section className="py-8 md:py-12 px-3 md:px-5 shadow-lg" style={{backgroundColor: 'rgba(255, 255, 255, 0.9)'}}>
        <div className="max-w-4xl mx-auto">
          <button
            className="mb-6 px-6 py-3 rounded-full font-semibold transition-all duration-300 text-base hover-lift inline-flex items-center gap-2 shadow-md"
            style={{backgroundColor: 'var(--accent-yellow)', color: 'var(--text-primary)'}}
            onClick={() => window.location.href = `/learn/category/${chapter.category_id}`}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-blue)'
              e.currentTarget.style.color = 'var(--white)'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 53, 102, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-yellow)'
              e.currentTarget.style.color = 'var(--text-primary)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)'
            }}
          >
            <span>←</span>
            <span>Back to {category?.name || 'Category'}</span>
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            {chapter.content_type === 'book_summary' && (
              <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{backgroundColor: 'var(--accent-blue)', color: 'var(--white)'}}>
                📚 Book Summary
              </span>
            )}
            <span className="text-sm" style={{color: 'var(--text-secondary)'}}>
              Chapter {chapter.chapter_number} • {readingTime} min read
            </span>
          </div>
          
          <h1 className="text-2xl md:text-4xl font-extrabold mb-4 tracking-tight" style={{color: 'var(--text-primary)'}}>
            {chapter.title}
          </h1>
          
          {chapter.description && (
            <div className="text-lg mb-6" style={{color: 'var(--text-secondary)'}}>
              {chapter.description}
            </div>
          )}

          {/* Book Summary Metadata */}
          {chapter.content_type === 'book_summary' && (
            <div className="rounded-lg p-4 mb-6" style={{backgroundColor: '#F8F8F8'}}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {chapter.author && (
                  <div>
                    <span className="font-semibold" style={{color: 'var(--text-secondary)'}}>Author:</span>
                    <span className="ml-2" style={{color: 'var(--text-primary)'}}>{chapter.author}</span>
                  </div>
                )}
                {chapter.reading_time && (
                  <div>
                    <span className="font-semibold" style={{color: 'var(--text-secondary)'}}>Original Length:</span>
                    <span className="ml-2" style={{color: 'var(--text-primary)'}}>{chapter.reading_time} hours</span>
                  </div>
                )}
                <div>
                  <span className="font-semibold" style={{color: 'var(--text-secondary)'}}>Summary Time:</span>
                  <span className="ml-2" style={{color: 'var(--text-primary)'}}>{readingTime} minutes</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Audio Player - Only show if audio has been generated */}
      {chapter.audio_url && (
        <section className="max-w-4xl mx-auto px-4 md:px-8 pt-8">
          <ChapterAudioPlayer 
            audioUrl={chapter.audio_url}
            title={chapter.title}
            readingTime={readingTime}
          />
        </section>
      )}

      {/* Content */}
      <section className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="chapter-content max-w-none">
          {formatContent(chapter.content || '')}
        </div>

        {/* Key Takeaways for Book Summaries */}
        {chapter.content_type === 'book_summary' && chapter.key_takeaways && chapter.key_takeaways.length > 0 && (
          <div className="mt-12 p-8 rounded-xl shadow-lg border-2" style={{backgroundColor: 'var(--white)', borderColor: 'var(--accent-yellow)', position: 'relative'}}>
            <div className="absolute -top-4 left-6 px-4 py-2 rounded-full flex items-center gap-2" style={{backgroundColor: 'var(--accent-yellow)'}}>
              <span className="text-2xl">🔑</span>
              <span className="font-bold text-lg" style={{color: 'var(--text-primary)'}}>Key Takeaways</span>
            </div>
            <div className="pt-6">
              <ul className="space-y-4">
                {chapter.key_takeaways.map((takeaway: string, index: number) => (
                  <li key={index} className="flex items-start gap-4 p-4 rounded-lg transition-all duration-300 hover:shadow-sm" style={{backgroundColor: 'rgba(255, 214, 10, 0.05)'}}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1" style={{backgroundColor: 'var(--accent-blue)'}}>
                      <span className="text-white font-bold text-sm">{index + 1}</span>
                    </div>
                    <span className="text-lg leading-relaxed" style={{color: 'var(--text-primary)'}}>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Try This Week */}
        {chapter.try_this_week && (
          <div className="mt-12 p-8 rounded-xl shadow-lg text-center relative overflow-hidden" style={{backgroundColor: 'var(--accent-blue)', background: 'linear-gradient(135deg, var(--accent-blue) 0%, #004080 100%)'}}>
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute top-4 right-4 w-16 h-16 rounded-full" style={{backgroundColor: 'var(--accent-yellow)'}}></div>
              <div className="absolute bottom-6 left-6 w-12 h-12 rounded-full" style={{backgroundColor: 'var(--accent-yellow)'}}></div>
            </div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-3 mb-6 px-6 py-3 rounded-full" style={{backgroundColor: 'rgba(255, 214, 10, 0.2)', border: '2px solid var(--accent-yellow)'}}>
                <span className="text-3xl">🎯</span>
                <h3 className="text-2xl font-bold" style={{color: 'var(--white)'}}>
                  Try This Week
                </h3>
              </div>
              <p className="text-xl leading-relaxed max-w-2xl mx-auto" style={{color: 'var(--white)'}}>
                {chapter.try_this_week}
              </p>
            </div>
          </div>
        )}

        {/* Media Players */}
        <div className="mt-12 space-y-8">
          {chapter.podcast_url && (
            <div className="p-6 rounded-xl border-2 shadow-lg" style={{backgroundColor: 'var(--white)', borderColor: 'var(--accent-yellow)'}}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl" style={{backgroundColor: 'var(--accent-yellow)'}}>
                  🎧
                </div>
                <div>
                  <h4 className="font-bold text-xl" style={{color: 'var(--text-primary)'}}>
                    {chapter.podcast_header || chapter.podcast_title || 'Podcast'}
                  </h4>
                  <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Listen to the audio version</p>
                </div>
              </div>
              
              {(() => {
                const podcastInfo = getPodcastEmbedInfo(chapter.podcast_url)
                
                if (podcastInfo.canEmbed) {
                  if (podcastInfo.type === 'spotify') {
                    return (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <iframe
                          src={podcastInfo.embedUrl}
                          width="100%"
                          height="232"
                          frameBorder="0"
                          allowFullScreen
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                          loading="lazy"
                          className="rounded-lg shadow-sm"
                          style={{border: 'none'}}
                        />
                        <div className="mt-3 text-center">
                          <a 
                            href={chapter.podcast_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm hover:underline"
                            style={{color: 'var(--accent-blue)'}}
                          >
                            Open in Spotify →
                          </a>
                        </div>
                      </div>
                    )
                  }
                  
                  if (podcastInfo.type === 'soundcloud') {
                    return (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <iframe
                          width="100%"
                          height="166"
                          scrolling="no"
                          frameBorder="no"
                          allow="autoplay"
                          src={podcastInfo.embedUrl}
                          className="rounded-lg"
                        />
                        <div className="mt-3 text-center">
                          <a 
                            href={chapter.podcast_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm hover:underline"
                            style={{color: 'var(--accent-blue)'}}
                          >
                            Open in SoundCloud →
                          </a>
                        </div>
                      </div>
                    )
                  }
                  
                  if (podcastInfo.type === 'anchor') {
                    return (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <iframe
                          src={podcastInfo.embedUrl}
                          height="102px"
                          width="100%"
                          frameBorder="0"
                          scrolling="no"
                          className="rounded-lg"
                        />
                        <div className="mt-3 text-center">
                          <a 
                            href={chapter.podcast_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm hover:underline"
                            style={{color: 'var(--accent-blue)'}}
                          >
                            Open in Anchor →
                          </a>
                        </div>
                      </div>
                    )
                  }
                  
                  if (podcastInfo.type === 'audio') {
                    return (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <audio 
                          controls 
                          className="w-full"
                          style={{backgroundColor: 'var(--accent-yellow)', borderRadius: '8px'}}
                        >
                          <source src={chapter.podcast_url} type="audio/mpeg" />
                          <source src={chapter.podcast_url} type="audio/wav" />
                          <source src={chapter.podcast_url} type="audio/mp4" />
                          <source src={chapter.podcast_url} type="audio/ogg" />
                          Your browser does not support the audio element.
                        </audio>
                        <div className="mt-3 text-center">
                          <a 
                            href={chapter.podcast_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm hover:underline"
                            style={{color: 'var(--accent-blue)'}}
                          >
                            Download audio file →
                          </a>
                        </div>
                      </div>
                    )
                  }
                }
                
                return (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-4xl" style={{backgroundColor: 'var(--accent-yellow)'}}>
                      🎵
                    </div>
                    <p className="text-lg font-medium mb-4" style={{color: 'var(--text-primary)'}}>Listen on your preferred platform</p>
                    <a 
                      href={chapter.podcast_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300"
                      style={{backgroundColor: 'var(--accent-blue)', color: 'var(--white)'}}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--accent-yellow)'
                        e.currentTarget.style.color = 'var(--text-primary)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--accent-blue)'
                        e.currentTarget.style.color = 'var(--white)'
                      }}
                    >
                      <span>Listen Now</span>
                      <span>→</span>
                    </a>
                  </div>
                )
              })()}
            </div>
          )}
          
          {chapter.video_url && (
            <div className="p-6 rounded-xl border-2 shadow-lg" style={{backgroundColor: 'var(--white)', borderColor: 'var(--accent-blue)'}}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl" style={{backgroundColor: 'var(--accent-blue)', color: 'var(--white)'}}>
                  📺
                </div>
                <div>
                  <h4 className="font-bold text-xl" style={{color: 'var(--text-primary)'}}>
                    {chapter.video_header || chapter.video_title || 'Video'}
                  </h4>
                  <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Watch the video content</p>
                </div>
              </div>
              
              {extractYouTubeId(chapter.video_url) ? (
                <div className="relative" style={{paddingBottom: '56.25%', height: 0}}>
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(chapter.video_url)}`}
                    title={chapter.video_header || chapter.video_title || 'Video'}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                  />
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-4xl" style={{backgroundColor: 'var(--accent-blue)', color: 'var(--white)'}}>
                    🎬
                  </div>
                  <p className="text-lg font-medium mb-4" style={{color: 'var(--text-primary)'}}>Watch on external platform</p>
                  <a 
                    href={chapter.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300"
                    style={{backgroundColor: 'var(--accent-blue)', color: 'var(--white)'}}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--accent-yellow)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--accent-blue)'
                      e.currentTarget.style.color = 'var(--white)'
                    }}
                  >
                    <span>Watch Now</span>
                    <span>→</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chapter Completion and Navigation Section */}
        {user && (
          <div className="mt-16 space-y-6">
            {/* Completion Status */}
            <div className="p-8 rounded-2xl shadow-xl text-center" style={{backgroundColor: 'var(--white)', border: '2px solid var(--accent-blue)'}}>
              {isCompleted ? (
                <div className="flex items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{backgroundColor: 'var(--accent-green, #10b981)'}}>
                    ✓
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>
                      Chapter Completed
                    </h3>
                    <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                      You've finished this chapter
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>
                    Finished Reading?
                  </h3>
                  <p className="text-lg mb-6" style={{color: 'var(--text-secondary)'}}>
                    Mark this chapter as complete to track your progress
                  </p>
                  <button
                    onClick={markChapterComplete}
                    disabled={completingChapter}
                    className="px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 hover-lift inline-flex items-center gap-3"
                    style={{
                      backgroundColor: completingChapter ? '#ccc' : 'var(--accent-green, #10b981)',
                      color: 'var(--white)',
                      cursor: completingChapter ? 'wait' : 'pointer'
                    }}
                  >
                    {completingChapter ? (
                      <>
                        <span>Marking Complete...</span>
                        <span className="animate-spin">⏳</span>
                      </>
                    ) : (
                      <>
                        <span>Mark as Complete</span>
                        <span className="text-xl">✓</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-4 justify-center">
              {(() => {
                const categoryChapters = allChapters
                  .filter(c => c.category_id === chapter.category_id)
                  .sort((a, b) => a.sort_order - b.sort_order)
                const currentIndex = categoryChapters.findIndex(c => c.id === chapter.id)
                const nextChapter = categoryChapters[currentIndex + 1]
                const prevChapter = categoryChapters[currentIndex - 1]

                return (
                  <>
                    {prevChapter && (
                      <button
                        onClick={() => router.push(`/learn/${prevChapter.id}`)}
                        className="px-6 py-3 rounded-full font-semibold transition-all duration-300 hover-lift inline-flex items-center gap-2"
                        style={{backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '2px solid var(--border-color)'}}
                      >
                        <span>←</span>
                        <span>Previous Chapter</span>
                      </button>
                    )}

                    <button
                      onClick={() => router.push('/learn')}
                      className="px-6 py-3 rounded-full font-semibold transition-all duration-300 hover-lift inline-flex items-center gap-2"
                      style={{backgroundColor: 'var(--accent-yellow)', color: 'var(--text-primary)'}}
                    >
                      <span>📚</span>
                      <span>All Chapters</span>
                    </button>

                    {nextChapter && (
                      <button
                        onClick={() => router.push(`/learn/${nextChapter.id}`)}
                        className="px-6 py-3 rounded-full font-bold transition-all duration-300 hover-lift inline-flex items-center gap-2"
                        style={{backgroundColor: 'var(--accent-blue)', color: 'var(--white)'}}
                      >
                        <span>Next Chapter</span>
                        <span>→</span>
                      </button>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}