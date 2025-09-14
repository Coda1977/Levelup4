'use client'

import { useState, useMemo } from 'react'
import { DndContext, DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { SortableChapter } from '@/components/SortableChapter'

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

interface ChapterListProps {
  chapters: Chapter[]
  categories: Category[]
  onChapterReorder: (chapters: Chapter[]) => void
  onEditChapter: (chapter: Chapter) => void
  onDeleteChapter: (id: string) => void
}

export default function ChapterList({ 
  chapters, 
  categories, 
  onChapterReorder, 
  onEditChapter, 
  onDeleteChapter 
}: ChapterListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Filter and group chapters
  const filteredAndGroupedChapters = useMemo(() => {
    let filtered = chapters.filter(chapter => {
      // Safety check: ensure chapter exists and has required properties
      if (!chapter || !chapter.title || !chapter.preview) return false
      
      const matchesSearch = chapter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          chapter.preview.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === '' || chapter.category_id === selectedCategory
      return matchesSearch && matchesCategory
    })

    // Group by category
    const grouped = categories.reduce((acc, category) => {
      const categoryChapters = filtered
        .filter(chapter => chapter.category_id === category.id)
        .sort((a, b) => a.sort_order - b.sort_order)
      
      if (categoryChapters.length > 0) {
        acc[category.id] = {
          category,
          chapters: categoryChapters
        }
      }
      return acc
    }, {} as Record<string, { category: Category; chapters: Chapter[] }>)

    return grouped
  }, [chapters, categories, searchTerm, selectedCategory])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) return

    const allChapters = [...chapters]
    const activeIndex = allChapters.findIndex(chapter => chapter.id === active.id)
    const overIndex = allChapters.findIndex(chapter => chapter.id === over.id)

    if (activeIndex !== -1 && overIndex !== -1) {
      const reorderedChapters = arrayMove(allChapters, activeIndex, overIndex)
      
      // Update sort_order for all chapters
      const updatedChapters = reorderedChapters.map((chapter, index) => ({
        ...chapter,
        sort_order: index + 1
      }))

      onChapterReorder(updatedChapters)
    }
  }

  const toggleCategoryCollapse = (categoryId: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  const totalChapters = chapters.length
  const filteredCount = Object.values(filteredAndGroupedChapters).reduce(
    (sum, group) => sum + group.chapters.length, 0
  )

  return (
    <div className="bg-white rounded-lg shadow-sm border" style={{borderColor: '#F0F0F0'}}>
      <div className="p-6 border-b" style={{borderColor: '#F0F0F0'}}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
              All Chapters ({totalChapters})
            </h3>
            {filteredCount < totalChapters && (
              <p className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>
                Showing {filteredCount} of {totalChapters} chapters
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search chapters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
              style={{borderColor: '#E5E5E5'}}
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:border-blue-500"
              style={{borderColor: '#E5E5E5'}}
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {Object.keys(filteredAndGroupedChapters).length === 0 ? (
          <div className="p-8 text-center" style={{color: 'var(--text-secondary)'}}>
            {searchTerm || selectedCategory ? 'No chapters match your filters.' : 'No chapters yet. Add your first chapter above!'}
          </div>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            {Object.values(filteredAndGroupedChapters).map(({ category, chapters: categoryChapters }) => (
              <div key={category.id} className="border-b last:border-b-0" style={{borderColor: '#F0F0F0'}}>
                <button
                  onClick={() => toggleCategoryCollapse(category.id)}
                  className="w-full p-4 text-left hover:bg-gray-50 transition-colors duration-200 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-medium" style={{color: 'var(--text-primary)'}}>
                      {category.name}
                    </h4>
                    <p className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>
                      {categoryChapters.length} chapter{categoryChapters.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="text-gray-400">
                    {collapsedCategories[category.id] ? '▼' : '▲'}
                  </span>
                </button>

                {!collapsedCategories[category.id] && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                            Order
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                            Chapter
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                            #
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                            Reading Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                            Media
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        <SortableContext 
                          items={categoryChapters.map(c => c.id)} 
                          strategy={verticalListSortingStrategy}
                        >
                          {categoryChapters.map((chapter, index) => (
                            <SortableChapter
                              key={chapter.id}
                              chapter={chapter}
                              index={index}
                              onEdit={onEditChapter}
                              onDelete={onDeleteChapter}
                            />
                          ))}
                        </SortableContext>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </DndContext>
        )}
      </div>
    </div>
  )
}