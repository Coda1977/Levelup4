'use client'

import { useState, useEffect } from 'react'
import ChapterForm from '@/components/admin/ChapterForm'
import ChapterList from '@/components/admin/ChapterList'

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
  content_type: string
  chapter_number: number
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

export default function AdminPanelClient() {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const loadData = async () => {
    try {
      setLoading(true)
      const [chaptersRes, categoriesRes] = await Promise.all([
        fetch('/api/admin/chapters'),
        fetch('/api/admin/chapters?categories=true')
      ])

      if (!chaptersRes.ok || !categoriesRes.ok) {
        throw new Error('Failed to load data')
      }

      const chaptersData = await chaptersRes.json()
      const categoriesData = await categoriesRes.json()
      
      setChapters(chaptersData.chapters)
      setCategories(categoriesData.categories)
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleFormSubmit = async (chapterData: any, isEditing: boolean) => {
    try {
      const method = isEditing ? 'PUT' : 'POST'
      const url = isEditing ? `/api/admin/chapters?id=${editingChapter?.id}` : '/api/admin/chapters'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chapterData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save chapter')
      }

      const result = await response.json()
      
      if (isEditing) {
        setChapters(chapters.map(ch => ch.id === editingChapter?.id ? result.chapter : ch))
        setSuccess('Chapter updated successfully')
      } else {
        setChapters([...chapters, result.chapter])
        setSuccess('Chapter created successfully')
      }

      handleFormCancel()
    } catch (error) {
      console.error('Error saving chapter:', error)
      setError(error instanceof Error ? error.message : 'Failed to save chapter')
    }
  }

  const handleFormCancel = () => {
    setEditingChapter(null)
    setShowForm(false)
  }

  const handleEditChapter = (chapter: Chapter) => {
    setEditingChapter(chapter)
    setShowForm(true)
  }

  const handleDeleteChapter = async (id: string) => {
    if (!confirm('Are you sure you want to delete this chapter?')) return

    try {
      const response = await fetch(`/api/admin/chapters?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete chapter')
      }

      setChapters(chapters.filter(ch => ch.id !== id))
      setSuccess('Chapter deleted successfully')
    } catch (error) {
      console.error('Error deleting chapter:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete chapter')
    }
  }

  const handleChapterReorder = async (reorderedChapters: Chapter[]) => {
    try {
      const response = await fetch('/api/admin/chapters', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chapters: reorderedChapters })
      })

      if (!response.ok) {
        throw new Error('Failed to reorder chapters')
      }

      setChapters(reorderedChapters)
      setSuccess('Chapter order updated')
    } catch (error) {
      console.error('Error reordering chapters:', error)
      setError('Failed to reorder chapters')
      // Reload to restore original order
      loadData()
    }
  }

  const exportData = async () => {
    try {
      const response = await fetch('/api/admin/chapters?export=true')
      if (!response.ok) throw new Error('Export failed')
      
      const data = await response.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chapters-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setSuccess('Data exported successfully')
    } catch (error) {
      setError('Failed to export data')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--background-light)'}}>
      <div className="max-w-6xl mx-auto px-5 md:px-10 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>
            Admin Panel
          </h1>
          <p style={{color: 'var(--text-secondary)'}}>
            Manage chapters, categories, and content
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 rounded-full font-medium transition-all duration-300 hover:scale-105"
            style={{ backgroundColor: 'var(--accent-blue)', color: 'var(--white)' }}
          >
            Add New Chapter
          </button>
          <button
            onClick={exportData}
            className="px-6 py-2 rounded-full font-medium transition-all duration-300 hover:scale-105 border-2"
            style={{ 
              borderColor: 'var(--accent-blue)', 
              color: 'var(--accent-blue)',
              backgroundColor: 'transparent'
            }}
          >
            Export Data
          </button>
        </div>

        {/* Chapter Form */}
        {showForm && (
          <div className="mb-8">
            <ChapterForm
              editingChapter={editingChapter}
              categories={categories}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          </div>
        )}

        {/* Chapter List */}
        <ChapterList
          chapters={chapters}
          categories={categories}
          onChapterReorder={handleChapterReorder}
          onEditChapter={handleEditChapter}
          onDeleteChapter={handleDeleteChapter}
        />

      </div>
    </div>
  )
}