import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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
  podcast_url: string | null
  video_url: string | null
}

interface SortableChapterProps {
  chapter: Chapter
  index: number
  onEdit: (chapter: Chapter) => void
  onDelete: (id: string) => void
}

export function SortableChapter({ chapter, index, onEdit, onDelete }: SortableChapterProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <tr
      ref={setNodeRef}
      style={{ ...style, borderTop: '1px solid #F0F0F0' }}
      className={`${index % 2 === 0 ? '' : 'bg-gray-50'} ${isDragging ? 'cursor-grabbing' : ''}`}
    >
      <td className="px-3 py-4">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab hover:bg-gray-200 rounded p-1 transition-colors"
          title="Drag to reorder"
        >
          ⋮⋮
        </button>
      </td>
      <td className="px-6 py-4">
        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
          {chapter.title}
        </div>
        <div className="text-sm mt-1 max-w-xs truncate" style={{ color: 'var(--text-secondary)' }}>
          {chapter.preview}
        </div>
      </td>
      <td className="px-6 py-4">
        <span
          className="inline-flex text-xs px-2 py-1 rounded-full font-medium"
          style={{
            backgroundColor: chapter.content_type === 'book_summary' ? 'var(--accent-yellow)' : 'var(--accent-blue)',
            color: chapter.content_type === 'book_summary' ? 'var(--text-primary)' : 'var(--white)',
          }}
        >
          {chapter.content_type === 'book_summary' ? '📚 Book' : '📝 Lesson'}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {chapter.chapter_number || '-'}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {chapter.reading_time ? `${chapter.reading_time} min` : '-'}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          {chapter.podcast_url && <span title="Has podcast">🎧</span>}
          {chapter.video_url && <span title="Has video">📺</span>}
          {!chapter.podcast_url && !chapter.video_url && <span className="text-gray-300">-</span>}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(chapter)}
            className="px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105"
            style={{ backgroundColor: 'var(--accent-blue)', color: 'var(--white)' }}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(chapter.id)}
            className="px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105"
            style={{ backgroundColor: '#DC2626', color: 'var(--white)' }}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  )
}