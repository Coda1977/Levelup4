import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { marked } from 'marked'

// Configure marked for clean HTML output
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false
})

export async function POST() {
  try {
    // Fetch all chapters
    const { data: chapters, error: fetchError } = await supabaseAdmin
      .from('chapters')
      .select('*')
      .order('created_at', { ascending: true })

    if (fetchError) {
      throw fetchError
    }

    if (!chapters || chapters.length === 0) {
      return NextResponse.json({ 
        message: 'No chapters found to migrate',
        migrated: 0 
      })
    }

    let migratedCount = 0
    const errors: any[] = []

    for (const chapter of chapters) {
      try {
        // Check if content is already HTML - look for HTML tags at the start
        const isHTML = chapter.content.trim().startsWith('<') && 
                      (chapter.content.includes('</p>') || 
                       chapter.content.includes('</h1>') || 
                       chapter.content.includes('</h2>') ||
                       chapter.content.includes('</div>'))
        
        if (isHTML) {
          console.log(`Skipping chapter ${chapter.id} - already HTML`)
          continue
        }
        
        console.log(`Converting chapter: ${chapter.title}`)

        // Convert markdown to HTML
        const htmlContent = marked(chapter.content)
        
        // Clean up the HTML (remove empty paragraphs, etc.)
        const cleanedHtml = htmlContent
          .replace(/<p>\s*<\/p>/g, '') // Remove empty paragraphs
          .replace(/\n\s*\n/g, '\n') // Remove extra newlines
          .trim()

        // Update the chapter with HTML content
        const { error: updateError } = await supabaseAdmin
          .from('chapters')
          .update({ 
            content: cleanedHtml
          })
          .eq('id', chapter.id)

        if (updateError) {
          errors.push({
            chapterId: chapter.id,
            title: chapter.title,
            error: updateError.message
          })
        } else {
          migratedCount++
          console.log(`Migrated chapter: ${chapter.title}`)
        }
      } catch (error) {
        errors.push({
          chapterId: chapter.id,
          title: chapter.title,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed. ${migratedCount} chapters migrated.`,
      migrated: migratedCount,
      total: chapters.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to migrate chapters',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Get migration status
export async function GET() {
  try {
    const { data: chapters, error } = await supabaseAdmin
      .from('chapters')
      .select('id, title, content')
      
    if (error) throw error

    const stats = {
      total: chapters?.length || 0,
      markdown: 0,
      html: 0,
      needsMigration: [] as string[]
    }

    chapters?.forEach(chapter => {
      const isHTML = chapter.content.trim().startsWith('<') && 
                    (chapter.content.includes('</p>') || 
                     chapter.content.includes('</h1>') || 
                     chapter.content.includes('</h2>'))
      
      if (isHTML) {
        stats.html++
      } else {
        stats.markdown++
        stats.needsMigration.push(chapter.title)
      }
    })

    return NextResponse.json({
      stats,
      message: stats.markdown > 0 
        ? `${stats.markdown} chapters need migration to HTML`
        : 'All chapters are already in HTML format'
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get migration status' },
      { status: 500 }
    )
  }
}