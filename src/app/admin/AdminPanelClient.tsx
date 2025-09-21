'use client'

import { useState, useEffect } from 'react'
import ChapterForm from '@/components/admin/ChapterForm'
import ChapterList from '@/components/admin/ChapterList'
import { useData } from '@/contexts/DataContext'
import { Chapter, Category } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminPanelClient() {
  const {
    chapters,
    categories,
    chaptersLoading,
    categoriesLoading,
    chaptersError,
    categoriesError,
    fetchChaptersAndCategories,
    updateChapter,
    deleteChapter,
    addChapter
  } = useData()

  const { isAdmin, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null)
  const [showForm, setShowForm] = useState(false)

  const loading = chaptersLoading || categoriesLoading || authLoading

  useEffect(() => {
    // Only fetch if user is admin
    if (!authLoading && !isAdmin) {
      router.push('/learn')
      return
    }
    if (isAdmin) {
      fetchChaptersAndCategories()
    }
  }, [fetchChaptersAndCategories, isAdmin, authLoading, router])

  // Update local error state when context errors change
  useEffect(() => {
    if (chaptersError || categoriesError) {
      setError(chaptersError || categoriesError)
    }
  }, [chaptersError, categoriesError])

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
        updateChapter(result.chapter)
        setSuccess('Chapter updated successfully')
      } else {
        addChapter(result.chapter)
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

      deleteChapter(id)
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

      // Update each chapter in the context
      reorderedChapters.forEach(chapter => updateChapter(chapter))
      setSuccess('Chapter order updated')
    } catch (error) {
      console.error('Error reordering chapters:', error)
      setError('Failed to reorder chapters')
      // Reload to restore original order
      fetchChaptersAndCategories()
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

  // Block access for non-admin users
  if (!authLoading && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--bg-primary)'}}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>Access Denied</h2>
          <p style={{color: 'var(--text-secondary)'}}>Admin privileges required to access this page.</p>
          <button
            onClick={() => router.push('/learn')}
            className="mt-6 px-6 py-3 rounded-full font-semibold transition-all duration-300"
            style={{backgroundColor: 'var(--accent-blue)', color: 'var(--white)'}}
          >
            Return to Learning
          </button>
        </div>
      </div>
    )
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
          <Link
            href="/admin/errors"
            className="px-6 py-2 rounded-full font-medium transition-all duration-300 hover:scale-105 border-2 text-center"
            style={{
              borderColor: 'var(--accent-yellow)',
              color: 'var(--accent-yellow)',
              backgroundColor: 'transparent',
              textDecoration: 'none'
            }}
          >
            Error Monitoring
          </Link>
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