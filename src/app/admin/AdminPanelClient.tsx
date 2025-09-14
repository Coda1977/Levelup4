'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { SortableChapter } from '@/components/SortableChapter'
import { TipTapEditor } from '@/components/TipTapEditor'
import AudioGenerationControls from '@/components/AudioGenerationControls'

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
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [migrationStatus, setMigrationStatus] = useState<any>(null)
  const [isMigrating, setIsMigrating] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    preview: '',
    category_id: '',
    sort_order: 1,
    content_type: 'lesson',
    chapter_number: 1,
    reading_time: null as number | null,
    podcast_title: '',
    podcast_url: '',
    video_title: '',
    video_url: '',
    try_this_week: '',
    author: '',
    description: '',
    key_takeaways: [] as string[],
    podcast_header: '',
    video_header: ''
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadData()
    checkMigrationStatus()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/chapters')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load data')
      }
      
      setCategories(data.categories || [])
      setChapters(data.chapters || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Automatic reading time calculation
  const calculateReadingTime = (content: string) => {
    const wordsPerMinute = 200
    const words = content.trim().split(/\s+/).length
    return Math.ceil(words / wordsPerMinute)
  }

  // Update reading time when content changes
  useEffect(() => {
    if (formData.content && !formData.reading_time) {
      const estimatedTime = calculateReadingTime(formData.content)
      setFormData(prev => ({ ...prev, reading_time: estimatedTime }))
    }
  }, [formData.content])

  // Auto-save functionality
  useEffect(() => {
    if (editingChapter && formData.content) {
      if (autoSaveTimer) clearTimeout(autoSaveTimer)
      
      const timer = setTimeout(() => {
        saveToLocalStorage()
        setLastSaved(new Date())
      }, 2000) // Auto-save after 2 seconds of inactivity
      
      setAutoSaveTimer(timer)
    }
    
    return () => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer)
    }
  }, [formData, editingChapter])

  const saveToLocalStorage = () => {
    const key = `chapter-draft-${editingChapter?.id || 'new'}`
    localStorage.setItem(key, JSON.stringify({
      ...formData,
      savedAt: new Date().toISOString()
    }))
  }

  const loadFromLocalStorage = (chapterId: string) => {
    const key = `chapter-draft-${chapterId}`
    const saved = localStorage.getItem(key)
    if (saved) {
      const data = JSON.parse(saved)
      return data
    }
    return null
  }

  // Handle drag end for reordering
  const handleDragEnd = async (event: DragEndEvent, categoryId: string) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const categoryChapters = chapters.filter(ch => ch.category_id === categoryId)
      const oldIndex = categoryChapters.findIndex(ch => ch.id === active.id)
      const newIndex = categoryChapters.findIndex(ch => ch.id === over?.id)
      
      const newOrder = arrayMove(categoryChapters, oldIndex, newIndex)
      
      // Update sort_order for all affected chapters
      const updatedChapters = newOrder.map((ch, index) => ({
        ...ch,
        sort_order: index + 1
      }))
      
      // Update local state immediately for responsiveness
      setChapters(prev => {
        const otherChapters = prev.filter(ch => ch.category_id !== categoryId)
        return [...otherChapters, ...updatedChapters].sort((a, b) => {
          if (a.category_id === b.category_id) {
            return a.sort_order - b.sort_order
          }
          return 0
        })
      })
      
      // Update in database
      for (const chapter of updatedChapters) {
        await fetch('/api/admin/chapters', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: chapter.id,
            sort_order: chapter.sort_order
          })
        })
      }
    }
  }

  // Filter chapters based on search and category
  const filteredChapters = chapters.filter(chapter => {
    const matchesSearch = searchTerm === '' || 
      chapter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chapter.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chapter.preview.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || chapter.category_id === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  // Group chapters by category
  const chaptersByCategory = categories.map(category => ({
    category,
    chapters: filteredChapters.filter(ch => ch.category_id === category.id)
      .sort((a, b) => a.sort_order - b.sort_order)
  })).filter(group => group.chapters.length > 0)

  const toggleCategoryCollapse = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  // Clean any residual markdown syntax from HTML content
  const cleanMixedContent = (content: string) => {
    let cleaned = content
    
    // Convert any remaining markdown bold to HTML
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    
    // Convert markdown italic to HTML
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    cleaned = cleaned.replace(/_([^_]+)_/g, '<em>$1</em>')
    
    return cleaned
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Remove savedAt field and auto-calculate reading time if not provided
    const { savedAt, ...cleanFormData } = formData as any
    
    // Clean the content to ensure no mixed markdown/HTML
    const cleanedContent = cleanMixedContent(cleanFormData.content)
    
    const dataToSubmit = {
      ...cleanFormData,
      content: cleanedContent,
      reading_time: cleanFormData.reading_time || calculateReadingTime(cleanFormData.content)
    }
    
    try {
      if (editingChapter) {
        const response = await fetch('/api/admin/chapters', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingChapter.id, ...dataToSubmit })
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update chapter')
        }
        
        // Clear local storage draft
        localStorage.removeItem(`chapter-draft-${editingChapter.id}`)
      } else {
        const response = await fetch('/api/admin/chapters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSubmit)
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create chapter')
        }
        
        // Clear local storage draft
        localStorage.removeItem('chapter-draft-new')
      }

      resetForm()
      loadData()
    } catch (error) {
      console.error('Error saving chapter:', error)
    }
  }

  const handleEdit = (chapter: Chapter) => {
    // Check for saved draft
    const draft = loadFromLocalStorage(chapter.id)
    
    if (draft && confirm('Found unsaved changes. Load draft?')) {
      setFormData(draft)
    } else {
      setFormData({
        title: chapter.title,
        content: chapter.content,
        preview: chapter.preview,
        category_id: chapter.category_id,
        sort_order: chapter.sort_order,
        content_type: chapter.content_type || 'lesson',
        chapter_number: chapter.chapter_number || 1,
        reading_time: chapter.reading_time,
        podcast_title: chapter.podcast_title || '',
        podcast_url: chapter.podcast_url || '',
        video_title: chapter.video_title || '',
        video_url: chapter.video_url || '',
        try_this_week: chapter.try_this_week || '',
        author: chapter.author || '',
        description: chapter.description || '',
        key_takeaways: chapter.key_takeaways || [],
        podcast_header: chapter.podcast_header || '',
        video_header: chapter.video_header || ''
      })
    }
    
    setEditingChapter(chapter)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this chapter?')) {
      try {
        const response = await fetch(`/api/admin/chapters?id=${id}`, {
          method: 'DELETE'
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to delete chapter')
        }
        
        loadData()
      } catch (error) {
        console.error('Error deleting chapter:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({ 
      title: '', 
      content: '', 
      preview: '', 
      category_id: '', 
      sort_order: 1, 
      content_type: 'lesson', 
      chapter_number: 1, 
      reading_time: null, 
      podcast_title: '', 
      podcast_url: '', 
      video_title: '', 
      video_url: '', 
      try_this_week: '',
      author: '',
      description: '',
      key_takeaways: [],
      podcast_header: '',
      video_header: ''
    })
    setEditingChapter(null)
    setShowForm(false)
    setLastSaved(null)
  }

  // Check migration status
  const checkMigrationStatus = async () => {
    try {
      const response = await fetch('/api/admin/migrate-chapters')
      const data = await response.json()
      setMigrationStatus(data.stats)
    } catch (error) {
      console.error('Error checking migration status:', error)
    }
  }

  // Run migration
  const runMigration = async () => {
    if (!confirm('This will convert all markdown chapters to HTML format. This action cannot be undone. Continue?')) {
      return
    }

    setIsMigrating(true)
    try {
      const response = await fetch('/api/admin/migrate-chapters', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        alert(`Migration successful! ${data.migrated} chapters converted to HTML.`)
        await loadData()
        await checkMigrationStatus()
      } else {
        alert(`Migration failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Migration error:', error)
      alert('Migration failed. Check console for details.')
    } finally {
      setIsMigrating(false)
    }
  }

  // Export functionality
  const exportData = () => {
    const exportObject = {
      categories,
      chapters: chapters.map(ch => {
        const { categories, ...chapterData } = ch
        return chapterData
      }),
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    }
    
    const dataStr = JSON.stringify(exportObject, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `levelup-export-${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  // Import functionality
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)
        
        if (!importedData.categories || !importedData.chapters) {
          throw new Error('Invalid import file format')
        }
        
        if (confirm('This will replace all existing data. Are you sure?')) {
          // Here you would implement the actual import logic
          alert('Import functionality would be implemented here')
          loadData()
        }
      } catch (error) {
        console.error('Error importing data:', error)
        alert('Failed to import data. Please check the file format.')
      }
    }
    reader.readAsText(file)
  }

  if (loading) {
    return (
      <div className="py-12 md:py-20 px-5 md:px-10" style={{backgroundColor: 'var(--bg-primary)'}}>
        <div className="max-w-6xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-b-transparent mx-auto mb-4" style={{borderColor: 'var(--accent-yellow)', borderBottomColor: 'transparent'}}></div>
          <p style={{color: 'var(--text-secondary)'}}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-12 md:py-20 px-5 md:px-10" style={{backgroundColor: 'var(--bg-primary)'}}>
      <div className="max-w-7xl mx-auto">
        {/* Header with Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="section-header" style={{color: 'var(--text-primary)'}}>Chapter Management</h1>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="hover-lift px-6 py-3 rounded-full font-semibold transition-all duration-300"
              style={{backgroundColor: 'var(--accent-blue)', color: 'var(--white)'}}
            >
              + Add New Chapter
            </button>
            <button
              onClick={exportData}
              className="hover-lift px-6 py-3 rounded-full font-semibold transition-all duration-300 border-2"
              style={{borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)', backgroundColor: 'transparent'}}
            >
              ↓ Export
            </button>
            <label className="hover-lift px-6 py-3 rounded-full font-semibold transition-all duration-300 border-2 cursor-pointer"
              style={{borderColor: 'var(--accent-yellow)', color: 'var(--text-primary)', backgroundColor: 'var(--accent-yellow)'}}>
              ↑ Import
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
          </div>
        </div>

        {/* Migration Alert */}
        {migrationStatus && migrationStatus.markdown > 0 && (
          <div className="p-6 rounded-2xl shadow-lg mb-6 border-2 border-orange-400" style={{backgroundColor: '#FFF7ED'}}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text-primary)'}}>
                  ⚠️ Content Migration Needed
                </h3>
                <p className="text-sm mb-2" style={{color: 'var(--text-secondary)'}}>
                  {migrationStatus.markdown} chapters are still in markdown format and need to be converted to HTML for consistency.
                </p>
                <details className="text-sm">
                  <summary className="cursor-pointer text-blue-600 hover:underline">View affected chapters</summary>
                  <ul className="mt-2 ml-4 list-disc">
                    {migrationStatus.needsMigration?.map((title: string, idx: number) => (
                      <li key={idx}>{title}</li>
                    ))}
                  </ul>
                </details>
              </div>
              <button
                onClick={runMigration}
                disabled={isMigrating}
                className="px-6 py-3 rounded-full font-semibold transition-all duration-300 bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {isMigrating ? 'Migrating...' : 'Run Migration'}
              </button>
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="p-6 rounded-2xl shadow-lg mb-6" style={{backgroundColor: 'var(--white)'}}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Search chapters by title, content, or preview..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
                style={{borderColor: '#E5E5E5'}}
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
              style={{borderColor: '#E5E5E5'}}
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{backgroundColor: 'var(--bg-primary)'}}>
              <span className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                {filteredChapters.length} chapters found
              </span>
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="p-8 rounded-2xl shadow-lg mb-8" style={{backgroundColor: 'var(--white)'}}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>
                {editingChapter ? 'Edit Chapter' : 'Add New Chapter'}
              </h2>
              <div className="flex items-center gap-4">
                {lastSaved && (
                  <span className="text-sm text-gray-500">
                    Auto-saved at {lastSaved.toLocaleTimeString()}
                  </span>
                )}
                {formData.content && (
                  <div className="px-4 py-2 rounded-full text-sm font-medium" style={{backgroundColor: 'var(--accent-yellow)', color: 'var(--text-primary)'}}>
                    Estimated reading time: {calculateReadingTime(formData.content)} min
                  </div>
                )}
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
                    style={{borderColor: '#E5E5E5'}}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full p-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
                    style={{borderColor: '#E5E5E5'}}
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Content Type</label>
                  <select
                    value={formData.content_type}
                    onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                    className="w-full p-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
                    style={{borderColor: '#E5E5E5'}}
                  >
                    <option value="lesson">Lesson</option>
                    <option value="book_summary">Book Summary</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Chapter Number</label>
                  <input
                    type="number"
                    value={formData.chapter_number}
                    onChange={(e) => setFormData({ ...formData, chapter_number: parseInt(e.target.value) })}
                    className="w-full p-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
                    style={{borderColor: '#E5E5E5'}}
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Sort Order</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                    className="w-full p-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
                    style={{borderColor: '#E5E5E5'}}
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Reading Time (min)</label>
                  <input
                    type="number"
                    value={formData.reading_time || ''}
                    onChange={(e) => setFormData({ ...formData, reading_time: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full p-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
                    style={{borderColor: '#E5E5E5'}}
                    min="1"
                    placeholder="Auto-calculated"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Preview</label>
                <textarea
                  value={formData.preview}
                  onChange={(e) => setFormData({ ...formData, preview: e.target.value })}
                  className="w-full p-3 border-2 rounded-lg h-24 transition-colors duration-200 focus:outline-none focus:border-blue-500"
                  style={{borderColor: '#E5E5E5'}}
                  placeholder="Brief preview of the chapter content..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                  Content
                </label>
                <TipTapEditor
                  value={formData.content}
                  onChange={(value) => setFormData({ ...formData, content: value })}
                  placeholder="Start writing your chapter content..."
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>Media Content (Optional)</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium" style={{color: 'var(--text-secondary)'}}>Podcast</h4>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Podcast URL</label>
                      <input
                        type="url"
                        value={formData.podcast_url}
                        onChange={(e) => setFormData({ ...formData, podcast_url: e.target.value })}
                        className="w-full p-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
                        style={{borderColor: '#E5E5E5'}}
                        placeholder="Spotify, SoundCloud, or direct audio URL"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium" style={{color: 'var(--text-secondary)'}}>Video</h4>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Video URL</label>
                      <input
                        type="url"
                        value={formData.video_url}
                        onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                        className="w-full p-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
                        style={{borderColor: '#E5E5E5'}}
                        placeholder="YouTube URL"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Try This Week (Call to Action)</label>
                <textarea
                  value={formData.try_this_week}
                  onChange={(e) => setFormData({ ...formData, try_this_week: e.target.value })}
                  className="w-full p-3 border-2 rounded-lg h-24 transition-colors duration-200 focus:outline-none focus:border-blue-500"
                  style={{borderColor: '#E5E5E5'}}
                  placeholder="Actionable challenge for readers to try this week..."
                />
              </div>

              {/* Audio Generation Section */}
              {editingChapter && (
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>
                    🎧 Audio Narration
                  </h3>
                  <AudioGenerationControls 
                    chapterId={editingChapter.id}
                    content={formData.content}
                    existingAudioUrl={editingChapter.audio_url}
                    onAudioGenerated={(audioUrl) => {
                      // Update the local state
                      setEditingChapter({ ...editingChapter, audio_url: audioUrl })
                    }}
                  />
                </div>
              )}

              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="hover-lift px-8 py-3 rounded-full font-semibold transition-all duration-300"
                  style={{backgroundColor: 'var(--accent-blue)', color: 'var(--white)'}}
                >
                  {editingChapter ? 'Update Chapter' : 'Create Chapter'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="hover-lift px-8 py-3 rounded-full font-semibold border-2 transition-all duration-300"
                  style={{borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)', backgroundColor: 'transparent'}}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Collapsible Category Sections */}
        <div className="space-y-4">
          {chaptersByCategory.length === 0 ? (
            <div className="rounded-2xl shadow-lg p-12 text-center" style={{backgroundColor: 'var(--white)'}}>
              <p className="text-xl" style={{color: 'var(--text-secondary)'}}>
                {searchTerm || selectedCategory !== 'all' 
                  ? 'No chapters found matching your criteria.'
                  : 'No chapters found. Add your first chapter above.'}
              </p>
            </div>
          ) : (
            chaptersByCategory.map(({ category, chapters }) => (
              <div key={category.id} className="rounded-2xl shadow-lg overflow-hidden" style={{backgroundColor: 'var(--white)'}}>
                <button
                  onClick={() => toggleCategoryCollapse(category.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  style={{backgroundColor: 'var(--bg-primary)'}}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl" style={{transform: collapsedCategories.has(category.id) ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.2s'}}>
                      ▶
                    </span>
                    <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                      {category.name}
                    </h3>
                    <span className="px-3 py-1 rounded-full text-sm font-medium" style={{backgroundColor: 'var(--accent-yellow)', color: 'var(--text-primary)'}}>
                      {chapters.length} chapters
                    </span>
                  </div>
                  <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                    {category.description}
                  </p>
                </button>
                
                {!collapsedCategories.has(category.id) && (
                  <div className="overflow-x-auto">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleDragEnd(event, category.id)}
                    >
                      <table className="w-full">
                        <thead style={{backgroundColor: '#F8F8F8'}}>
                          <tr>
                            <th className="px-3 py-3 text-left text-sm font-semibold uppercase tracking-wider" style={{color: 'var(--text-primary)'}}>
                              
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider" style={{color: 'var(--text-primary)'}}>
                              Title
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider" style={{color: 'var(--text-primary)'}}>
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider" style={{color: 'var(--text-primary)'}}>
                              Ch #
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider" style={{color: 'var(--text-primary)'}}>
                              Time
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider" style={{color: 'var(--text-primary)'}}>
                              Media
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider" style={{color: 'var(--text-primary)'}}>
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <SortableContext
                          items={chapters.map(ch => ch.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <tbody>
                            {chapters.map((chapter, index) => (
                              <SortableChapter
                                key={chapter.id}
                                chapter={chapter}
                                index={index}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                              />
                            ))}
                          </tbody>
                        </SortableContext>
                      </table>
                    </DndContext>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}