const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Function to convert markdown syntax within HTML to proper HTML
function cleanMixedContent(content) {
  let cleaned = content
  
  // Convert markdown headers (##, ###, etc.) to HTML headers
  cleaned = cleaned.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  cleaned = cleaned.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  cleaned = cleaned.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
  
  // Convert markdown bold (**text**) to HTML strong tags
  // Be careful not to convert already proper HTML
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  
  // Convert markdown italic (*text* or _text_) to HTML em tags
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  cleaned = cleaned.replace(/_([^_]+)_/g, '<em>$1</em>')
  
  // Convert markdown links [text](url) to HTML links
  cleaned = cleaned.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  
  // Ensure paragraphs are properly wrapped
  // Split by double newlines and wrap non-HTML blocks in <p> tags
  const lines = cleaned.split(/\n\n+/)
  cleaned = lines.map(line => {
    line = line.trim()
    if (!line) return ''
    
    // Check if line already starts with an HTML tag
    const htmlPattern = /^<(p|h[1-6]|div|blockquote|ul|ol|li|strong|em)/i
    if (htmlPattern.test(line)) {
      return line
    }
    
    // If it's plain text, wrap in paragraph tags
    return `<p>${line}</p>`
  }).filter(line => line).join('\n\n')
  
  // Clean up any double-wrapped tags
  cleaned = cleaned.replace(/<p>\s*<p>/g, '<p>')
  cleaned = cleaned.replace(/<\/p>\s*<\/p>/g, '</p>')
  
  return cleaned
}

async function fixMixedContent() {
  try {
    console.log('🔍 Fetching all chapters...')
    
    const { data: chapters, error: fetchError } = await supabase
      .from('chapters')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (fetchError) {
      throw fetchError
    }
    
    if (!chapters || chapters.length === 0) {
      console.log('No chapters found.')
      return
    }
    
    console.log(`📚 Found ${chapters.length} chapters to check\n`)
    
    let fixedCount = 0
    const issues = []
    
    for (const chapter of chapters) {
      const originalContent = chapter.content
      
      // Check if content has mixed markdown/HTML
      const hasMarkdownBold = /\*\*[^*]+\*\*/.test(originalContent)
      const hasMarkdownHeaders = /^##+ /m.test(originalContent)
      const hasMarkdownLinks = /\[[^\]]+\]\([^)]+\)/.test(originalContent)
      const hasHTMLTags = /<(p|h[1-6]|div|blockquote|strong|em)/i.test(originalContent)
      
      const isMixed = hasHTMLTags && (hasMarkdownBold || hasMarkdownHeaders || hasMarkdownLinks)
      
      if (isMixed) {
        console.log(`\n🔧 Fixing mixed content in: ${chapter.title}`)
        console.log(`   - Has HTML tags: ${hasHTMLTags}`)
        console.log(`   - Has Markdown bold (**): ${hasMarkdownBold}`)
        console.log(`   - Has Markdown headers (##): ${hasMarkdownHeaders}`)
        console.log(`   - Has Markdown links: ${hasMarkdownLinks}`)
        
        const cleanedContent = cleanMixedContent(originalContent)
        
        // Update the chapter
        const { error: updateError } = await supabase
          .from('chapters')
          .update({ content: cleanedContent })
          .eq('id', chapter.id)
        
        if (updateError) {
          issues.push({
            chapter: chapter.title,
            error: updateError.message
          })
          console.log(`   ❌ Error updating: ${updateError.message}`)
        } else {
          fixedCount++
          console.log(`   ✅ Successfully cleaned and updated`)
        }
      }
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('📊 Summary:')
    console.log(`   - Total chapters: ${chapters.length}`)
    console.log(`   - Mixed content fixed: ${fixedCount}`)
    if (issues.length > 0) {
      console.log(`   - Errors: ${issues.length}`)
      issues.forEach(issue => {
        console.log(`     • ${issue.chapter}: ${issue.error}`)
      })
    }
    console.log('='.repeat(50))
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the fix
fixMixedContent()