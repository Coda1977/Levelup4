'use client'

import { useState, useEffect } from 'react'
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
}

interface ChapterFormProps {
  editingChapter: Chapter | null
  categories: Category[]
  onSubmit: (chapterData: any, isEditing: boolean) => Promise<void>
  onCancel: () => void
}

export default function ChapterForm({ editingChapter, categories, onSubmit, onCancel }: ChapterFormProps) {
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

  const [keyTakeawaysText, setKeyTakeawaysText] = useState('')
  
  // Auto-save to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      if (editingChapter && formData.title) {
        localStorage.setItem(`draft-${editingChapter.id}`, JSON.stringify(formData))
        localStorage.setItem(`draft-timestamp-${editingChapter.id}`, Date.now().toString())
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [formData, editingChapter])

  // Load editing chapter data
  useEffect(() => {
    if (editingChapter) {
      setFormData({
        title: editingChapter.title || '',
        content: editingChapter.content || '',
        preview: editingChapter.preview || '',
        category_id: editingChapter.category_id || '',
        sort_order: editingChapter.sort_order || 1,
        content_type: editingChapter.content_type || 'lesson',
        chapter_number: editingChapter.chapter_number || 1,
        reading_time: editingChapter.reading_time,
        podcast_title: editingChapter.podcast_title || '',
        podcast_url: editingChapter.podcast_url || '',
        video_title: editingChapter.video_title || '',
        video_url: editingChapter.video_url || '',
        try_this_week: editingChapter.try_this_week || '',
        author: editingChapter.author || '',
        description: editingChapter.description || '',
        key_takeaways: editingChapter.key_takeaways || [],
        podcast_header: editingChapter.podcast_header || '',
        video_header: editingChapter.video_header || ''
      })
      
      setKeyTakeawaysText((editingChapter.key_takeaways || []).join('\n'))
    } else {
      // Reset for new chapter
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
      setKeyTakeawaysText('')
    }
  }, [editingChapter])

  // Handle key takeaways text changes
  useEffect(() => {
    const takeaways = keyTakeawaysText.split('\n').filter(line => line.trim())
    setFormData(prev => ({ ...prev, key_takeaways: takeaways }))
  }, [keyTakeawaysText])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Remove savedAt field and clean form data
    const { savedAt, ...cleanFormData } = formData as any
    
    const dataToSubmit = {
      ...cleanFormData,
      reading_time: cleanFormData.reading_time || calculateReadingTime(cleanFormData.content)
    }

    await onSubmit(dataToSubmit, !!editingChapter)
    
    // Clear auto-save data
    if (editingChapter) {
      localStorage.removeItem(`draft-${editingChapter.id}`)
      localStorage.removeItem(`draft-timestamp-${editingChapter.id}`)
    }
  }

  const calculateReadingTime = (content: string): number => {
    const wordsPerMinute = 200
    const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length
    return Math.ceil(words / wordsPerMinute)
  }

  const handleCancel = () => {
    if (editingChapter) {
      localStorage.removeItem(`draft-${editingChapter.id}`)
      localStorage.removeItem(`draft-timestamp-${editingChapter.id}`)
    }
    onCancel()
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border" style={{borderColor: '#F0F0F0'}}>
      <div className="p-6 border-b" style={{borderColor: '#F0F0F0'}}>
        <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
          {editingChapter ? 'Edit Chapter' : 'Add New Chapter'}
        </h3>
      </div>

      <div className="p-6">
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Reading Time (min)</label>
              <input
                type="number"
                value={formData.reading_time || ''}
                onChange={(e) => setFormData({ ...formData, reading_time: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Auto-calculated"
                className="w-full p-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
                style={{borderColor: '#E5E5E5'}}
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Content</label>
            <TipTapEditor
              value={formData.content}
              onChange={(content) => setFormData({ ...formData, content })}
              placeholder="Start writing your chapter content..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Preview/Summary</label>
            <textarea
              value={formData.preview}
              onChange={(e) => setFormData({ ...formData, preview: e.target.value })}
              placeholder="Brief description of this chapter..."
              className="w-full p-3 border-2 rounded-lg h-24 transition-colors duration-200 focus:outline-none focus:border-blue-500"
              style={{borderColor: '#E5E5E5'}}
            />
          </div>

          {/* Enhanced Fields */}
          <div className="border-t pt-6" style={{borderColor: '#F0F0F0'}}>
            <h4 className="text-md font-medium mb-4" style={{color: 'var(--text-primary)'}}>Enhanced Content</h4>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Author</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Content author"
                  className="w-full p-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
                  style={{borderColor: '#E5E5E5'}}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description"
                  className="w-full p-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
                  style={{borderColor: '#E5E5E5'}}
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Key Takeaways</label>
              <textarea
                value={keyTakeawaysText}
                onChange={(e) => setKeyTakeawaysText(e.target.value)}
                placeholder="One key takeaway per line..."
                className="w-full p-3 border-2 rounded-lg h-24 transition-colors duration-200 focus:outline-none focus:border-blue-500"
                style={{borderColor: '#E5E5E5'}}
              />
            </div>

            {/* Media Fields */}
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-4">
                <h5 className="font-medium" style={{color: 'var(--text-primary)'}}>Podcast Information</h5>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Podcast Header</label>
                  <input
                    type="text"
                    value={formData.podcast_header}
                    onChange={(e) => setFormData({ ...formData, podcast_header: e.target.value })}
                    placeholder="Custom podcast section header"
                    className="w-full p-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
                    style={{borderColor: '#E5E5E5'}}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Podcast Title</label>
                  <input
                    type="text"
                    value={formData.podcast_title}
                    onChange={(e) => setFormData({ ...formData, podcast_title: e.target.value })}
                    placeholder="Podcast episode title"
                    className="w-full p-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
                    style={{borderColor: '#E5E5E5'}}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Podcast URL</label>
                  <input
                    type="url"
                    value={formData.podcast_url}
                    onChange={(e) => setFormData({ ...formData, podcast_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full p-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
                    style={{borderColor: '#E5E5E5'}}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="font-medium" style={{color: 'var(--text-primary)'}}>Video Information</h5>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Video Header</label>
                  <input
                    type="text"
                    value={formData.video_header}
                    onChange={(e) => setFormData({ ...formData, video_header: e.target.value })}
                    placeholder="Custom video section header"
                    className="w-full p-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
                    style={{borderColor: '#E5E5E5'}}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Video Title</label>
                  <input
                    type="text"
                    value={formData.video_title}
                    onChange={(e) => setFormData({ ...formData, video_title: e.target.value })}
                    placeholder="Video title"
                    className="w-full p-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
                    style={{borderColor: '#E5E5E5'}}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Video URL</label>
                  <input
                    type="url"
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full p-3 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
                    style={{borderColor: '#E5E5E5'}}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Try This Week</label>
              <textarea
                value={formData.try_this_week}
                onChange={(e) => setFormData({ ...formData, try_this_week: e.target.value })}
                placeholder="Actionable suggestions for this week..."
                className="w-full p-3 border-2 rounded-lg h-24 transition-colors duration-200 focus:outline-none focus:border-blue-500"
                style={{borderColor: '#E5E5E5'}}
              />
            </div>
          </div>

          {/* Audio Generation for existing chapters */}
          {editingChapter && (
            <div className="border-t pt-6" style={{borderColor: '#F0F0F0'}}>
              <h4 className="text-md font-medium mb-4" style={{color: 'var(--text-primary)'}}>Audio Generation</h4>
              <AudioGenerationControls 
                chapterId={editingChapter.id}
                content={editingChapter.content}
                existingAudioUrl={editingChapter.audio_url}
              />
            </div>
          )}

          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              className="px-6 py-2 rounded-full font-medium transition-all duration-300 hover:scale-105"
              style={{ backgroundColor: 'var(--accent-blue)', color: 'var(--white)' }}
            >
              {editingChapter ? 'Update Chapter' : 'Create Chapter'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 rounded-full font-medium transition-all duration-300 hover:scale-105"
              style={{ backgroundColor: '#6B7280', color: 'var(--white)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}