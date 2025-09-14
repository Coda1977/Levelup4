'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useState } from 'react'
import { sanitizeHtml } from '@/lib/sanitize'

interface TipTapEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
}

export function TipTapEditor({ value, onChange, placeholder = 'Start writing...', className, style }: TipTapEditorProps) {
  const [showPreview, setShowPreview] = useState(false)
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        },
        paragraph: {
          HTMLAttributes: {
            class: 'mb-4'
          }
        },
        hardBreak: {
          keepMarks: true
        }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'text-blue-500 hover:underline'
        }
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'before:content-[attr(data-placeholder)] before:text-gray-400 before:float-left before:h-0 before:pointer-events-none'
      })
    ],
    content: value,
    onUpdate: ({ editor }) => {
      // Always output HTML for consistency
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4'
      }
    },
    immediatelyRender: false
  })

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && value !== editor.getHTML() && value !== '') {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) {
    return null
  }

  const MenuBar = () => {
    return (
      <div className="flex flex-wrap items-center gap-1 p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        {/* Text formatting */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={`px-2 py-1 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('bold') ? 'bg-gray-300 font-bold' : ''
            }`}
            title="Bold (Ctrl+B)"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={`px-2 py-1 rounded hover:bg-gray-200 transition-colors italic ${
              editor.isActive('italic') ? 'bg-gray-300' : ''
            }`}
            title="Italic (Ctrl+I)"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run()}
            className={`px-2 py-1 rounded hover:bg-gray-200 transition-colors line-through ${
              editor.isActive('strike') ? 'bg-gray-300' : ''
            }`}
            title="Strikethrough"
          >
            S
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            disabled={!editor.can().chain().focus().toggleCode().run()}
            className={`px-2 py-1 rounded hover:bg-gray-200 transition-colors font-mono text-sm ${
              editor.isActive('code') ? 'bg-gray-300' : ''
            }`}
            title="Code"
          >
            {'</>'}
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Headings */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-2 py-1 rounded hover:bg-gray-200 transition-colors font-bold ${
              editor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : ''
            }`}
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-2 py-1 rounded hover:bg-gray-200 transition-colors font-bold text-sm ${
              editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : ''
            }`}
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-2 py-1 rounded hover:bg-gray-200 transition-colors font-bold text-xs ${
              editor.isActive('heading', { level: 3 }) ? 'bg-gray-300' : ''
            }`}
            title="Heading 3"
          >
            H3
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Lists */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-2 py-1 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('bulletList') ? 'bg-gray-300' : ''
            }`}
            title="Bullet List"
          >
            • —
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`px-2 py-1 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('orderedList') ? 'bg-gray-300' : ''
            }`}
            title="Numbered List"
          >
            1. —
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`px-2 py-1 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('blockquote') ? 'bg-gray-300' : ''
            }`}
            title="Quote"
          >
            "
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Other */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="px-2 py-1 rounded hover:bg-gray-200 transition-colors"
            title="Horizontal Rule"
          >
            —
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setHardBreak().run()}
            className="px-2 py-1 rounded hover:bg-gray-200 transition-colors"
            title="Line Break"
          >
            ↵
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`px-2 py-1 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('codeBlock') ? 'bg-gray-300' : ''
            }`}
            title="Code Block"
          >
            {'</>'}
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            className="px-2 py-1 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
            title="Undo (Ctrl+Z)"
          >
            ↶
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            className="px-2 py-1 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
            title="Redo (Ctrl+Y)"
          >
            ↷
          </button>
        </div>

        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="text-gray-500">{editor.storage.characterCount?.characters() || 0} characters</span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-500">{editor.storage.characterCount?.words() || editor.getText().split(/\s+/).filter(word => word.length > 0).length} words</span>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`px-4 py-1.5 rounded-full font-medium transition-all ${
              showPreview 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {showPreview ? '👁 Preview Mode' : '✏️ Edit Mode'}
          </button>
        </div>
      </div>
    )
  }

  // Format content for preview (similar to how it appears on the reading page)
  const formatContentForPreview = (html: string) => {
    return html
      .replace(/<h1>/g, '<h1 class="text-3xl font-bold mb-4 mt-6">')
      .replace(/<h2>/g, '<h2 class="text-2xl font-bold mb-3 mt-5">')
      .replace(/<h3>/g, '<h3 class="text-xl font-semibold mb-2 mt-4">')
      .replace(/<p>/g, '<p class="mb-4 leading-relaxed">')
      .replace(/<ul>/g, '<ul class="mb-4 ml-6 list-disc">')
      .replace(/<ol>/g, '<ol class="mb-4 ml-6 list-decimal">')
      .replace(/<blockquote>/g, '<blockquote class="border-l-4 border-yellow-400 pl-4 my-4 italic bg-yellow-50 py-2">')
  }

  return (
    <div className="tiptap-editor-container">
      <div className="border-2 rounded-lg overflow-hidden" style={{ borderColor: '#E5E5E5' }}>
        <MenuBar />
        {showPreview ? (
          <div className="min-h-[300px] max-h-[600px] overflow-y-auto bg-white p-8">
            <div className="max-w-3xl mx-auto">
              <div className="text-sm text-gray-500 mb-4 text-center">
                📖 Preview Mode - This is how your content will appear to readers
              </div>
              <div 
                className="chapter-content"
                dangerouslySetInnerHTML={{ 
                  __html: sanitizeHtml(formatContentForPreview(editor?.getHTML() || '')) 
                }}
              />
            </div>
          </div>
        ) : (
          <EditorContent 
            editor={editor} 
            className={`min-h-[300px] max-h-[600px] overflow-y-auto bg-white ${className}`}
            style={style}
          />
        )}
      </div>
      
      {/* Formatting help */}
      <div className="mt-2 text-xs text-gray-500">
        <details>
          <summary className="cursor-pointer hover:text-gray-700">Keyboard shortcuts</summary>
          <div className="mt-2 p-3 bg-gray-50 rounded grid grid-cols-2 gap-2">
            <div><kbd>Ctrl+B</kbd> → Bold</div>
            <div><kbd>Ctrl+I</kbd> → Italic</div>
            <div><kbd>Ctrl+U</kbd> → Underline</div>
            <div><kbd>Ctrl+Shift+S</kbd> → Strikethrough</div>
            <div><kbd>Ctrl+E</kbd> → Code</div>
            <div><kbd>Ctrl+Shift+1</kbd> → Heading 1</div>
            <div><kbd>Ctrl+Shift+2</kbd> → Heading 2</div>
            <div><kbd>Ctrl+Shift+3</kbd> → Heading 3</div>
            <div><kbd>Ctrl+Shift+7</kbd> → Ordered list</div>
            <div><kbd>Ctrl+Shift+8</kbd> → Bullet list</div>
            <div><kbd>Ctrl+Shift+9</kbd> → Blockquote</div>
            <div><kbd>Ctrl+Z</kbd> → Undo</div>
            <div><kbd>Ctrl+Y</kbd> → Redo</div>
          </div>
        </details>
      </div>

      <style jsx global>{`
        .ProseMirror {
          min-height: 300px;
          padding: 1rem;
        }
        
        .ProseMirror:focus {
          outline: none;
        }
        
        .ProseMirror h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 1em 0 0.5em;
        }
        
        .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 1em 0 0.5em;
        }
        
        .ProseMirror h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin: 1em 0 0.5em;
        }
        
        .ProseMirror p {
          margin: 0.75em 0;
        }
        
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5em;
          margin: 0.75em 0;
        }
        
        .ProseMirror li {
          margin: 0.25em 0;
        }
        
        .ProseMirror blockquote {
          border-left: 3px solid #e5e7eb;
          padding-left: 1em;
          margin: 1em 0;
          font-style: italic;
          color: #6b7280;
        }
        
        .ProseMirror code {
          background-color: #f3f4f6;
          padding: 0.125em 0.25em;
          border-radius: 0.25em;
          font-family: monospace;
          font-size: 0.875em;
        }
        
        .ProseMirror pre {
          background-color: #1f2937;
          color: #f3f4f6;
          padding: 1em;
          border-radius: 0.5em;
          overflow-x: auto;
          margin: 1em 0;
        }
        
        .ProseMirror pre code {
          background: none;
          padding: 0;
          color: inherit;
        }
        
        .ProseMirror hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 2em 0;
        }
        
        .ProseMirror strong {
          font-weight: bold;
        }
        
        .ProseMirror em {
          font-style: italic;
        }
        
        .ProseMirror s {
          text-decoration: line-through;
        }
      `}</style>
    </div>
  )
}