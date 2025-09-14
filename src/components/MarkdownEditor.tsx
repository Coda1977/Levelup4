import { useState, useEffect } from 'react'
import { sanitizeHtml } from '@/lib/sanitize'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
}

export function MarkdownEditor({ value, onChange, placeholder, className, style }: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [previewContent, setPreviewContent] = useState('')

  // Simple markdown to HTML conversion
  const parseMarkdown = (markdown: string) => {
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Lists
      .replace(/^\* (.+)/gim, '<li>$1</li>')
      .replace(/(<li>[\s\S]*<\/li>)/g, '<ul>$1</ul>')
      // Line breaks
      .replace(/\n\n/g, '</p><p>')
      // Blockquotes
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    
    // Wrap in paragraph tags if not already wrapped
    if (!html.startsWith('<')) {
      html = `<p>${html}</p>`
    }
    
    return html
  }

  useEffect(() => {
    setPreviewContent(parseMarkdown(value))
  }, [value])

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = document.getElementById('markdown-textarea') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const replacement = `${before}${selectedText}${after}`
    
    const newValue = value.substring(0, start) + replacement + value.substring(end)
    onChange(newValue)
    
    // Reset cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      )
    }, 0)
  }

  return (
    <div className="markdown-editor-container">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-2 p-2 border-2 border-b-0 rounded-t-lg bg-gray-50" style={{borderColor: '#E5E5E5'}}>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => insertMarkdown('**', '**')}
            className="px-2 py-1 text-sm font-bold hover:bg-gray-200 rounded"
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('*', '*')}
            className="px-2 py-1 text-sm italic hover:bg-gray-200 rounded"
            title="Italic"
          >
            I
          </button>
          <div className="w-px bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={() => insertMarkdown('## ')}
            className="px-2 py-1 text-sm hover:bg-gray-200 rounded"
            title="Heading"
          >
            H
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('> ')}
            className="px-2 py-1 text-sm hover:bg-gray-200 rounded"
            title="Quote"
          >
            "
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('- ')}
            className="px-2 py-1 text-sm hover:bg-gray-200 rounded"
            title="List"
          >
            ☰
          </button>
          <div className="w-px bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={() => insertMarkdown('[', '](url)')}
            className="px-2 py-1 text-sm hover:bg-gray-200 rounded"
            title="Link"
          >
            🔗
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {value.split(' ').filter(w => w).length} words
          </span>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="px-3 py-1 text-sm font-medium rounded transition-colors"
            style={{
              backgroundColor: showPreview ? 'var(--accent-yellow)' : '#E5E5E5',
              color: showPreview ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}
          >
            {showPreview ? '👁 Preview' : '✏️ Edit'}
          </button>
        </div>
      </div>

      {/* Editor/Preview */}
      <div className="relative">
        {showPreview ? (
          <div 
            className="w-full p-3 border-2 rounded-b-lg min-h-[200px] bg-white prose prose-sm max-w-none"
            style={{borderColor: '#E5E5E5'}}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewContent) }}
          />
        ) : (
          <textarea
            id="markdown-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full p-3 border-2 rounded-b-lg transition-colors duration-200 focus:outline-none focus:border-blue-500 font-mono text-sm ${className}`}
            style={{borderColor: '#E5E5E5', minHeight: '200px', ...style}}
            placeholder={placeholder}
          />
        )}
      </div>

      {/* Markdown Help */}
      <div className="mt-2 text-xs text-gray-500">
        <details>
          <summary className="cursor-pointer hover:text-gray-700">Markdown formatting help</summary>
          <div className="mt-2 p-3 bg-gray-50 rounded space-y-1">
            <div><code>**bold**</code> → <strong>bold</strong></div>
            <div><code>*italic*</code> → <em>italic</em></div>
            <div><code>## Heading</code> → <strong>Heading</strong></div>
            <div><code>&gt; Quote</code> → Blockquote</div>
            <div><code>- List item</code> → • List item</div>
            <div><code>[Link](url)</code> → <a href="#" className="text-blue-500">Link</a></div>
          </div>
        </details>
      </div>
    </div>
  )
}