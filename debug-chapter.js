const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables:')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceRoleKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function debugChapter() {
  console.log('🔍 Debug Script for "Your Number 1 Role" Chapter')
  console.log('=' .repeat(60))
  
  try {
    // First, let's find the chapter by title
    console.log('📊 Searching for chapters with "Number 1 Role" in title...')
    
    const { data: chapters, error } = await supabase
      .from('chapters')
      .select('*')
      .ilike('title', '%Number 1 Role%')
    
    if (error) {
      console.error('❌ Error fetching chapters:', error)
      return
    }
    
    console.log(`✅ Found ${chapters.length} matching chapter(s)`)
    
    if (chapters.length === 0) {
      // If no exact match, let's search more broadly
      console.log('🔄 Searching for chapters with "role" in title...')
      
      const { data: roleChapters, error: roleError } = await supabase
        .from('chapters')
        .select('*')
        .ilike('title', '%role%')
      
      if (roleError) {
        console.error('❌ Error in broader search:', roleError)
        return
      }
      
      console.log(`📋 Found ${roleChapters.length} chapter(s) with "role" in title:`)
      roleChapters.forEach((chapter, index) => {
        console.log(`  ${index + 1}. "${chapter.title}" (ID: ${chapter.id})`)
      })
      
      if (roleChapters.length === 0) {
        console.log('📋 Let\'s see all chapters to identify the correct one:')
        const { data: allChapters } = await supabase
          .from('chapters')
          .select('id, title, content_type')
          .order('sort_order')
        
        allChapters?.forEach((chapter, index) => {
          console.log(`  ${index + 1}. "${chapter.title}" (ID: ${chapter.id}, Type: ${chapter.content_type})`)
        })
      }
      
      return
    }
    
    // Analyze each matching chapter
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i]
      console.log(`\n📖 Chapter ${i + 1}: "${chapter.title}"`)
      console.log('-'.repeat(50))
      console.log(`🆔 ID: ${chapter.id}`)
      console.log(`📂 Category ID: ${chapter.category_id}`)
      console.log(`📋 Content Type: ${chapter.content_type}`)
      console.log(`🔢 Chapter Number: ${chapter.chapter_number}`)
      console.log(`📊 Sort Order: ${chapter.sort_order}`)
      console.log(`📅 Created: ${new Date(chapter.created_at).toLocaleString()}`)
      
      // Check content format
      const content = chapter.content || ''
      console.log(`\n📝 Content Analysis:`)
      console.log(`📏 Content Length: ${content.length} characters`)
      
      // Check for HTML tags (same logic as the frontend)
      const htmlTagPattern = /<(p|h[1-6]|div|span|strong|em|ul|ol|li|blockquote|br|hr|a|img)[^>]*>/i
      const hasHtmlTags = htmlTagPattern.test(content)
      console.log(`🏷️  Contains HTML tags: ${hasHtmlTags ? '✅ YES' : '❌ NO'}`)
      
      // Check for common markdown patterns
      const hasMarkdownHeaders = /^#{1,6}\s/.test(content) || /\n#{1,6}\s/.test(content)
      const hasMarkdownBold = /\*\*(.*?)\*\*/.test(content)
      const hasMarkdownItalic = /(?<!\*)\*(?!\*)(.*?)\*(?!\*)/.test(content)
      const hasMarkdownLinks = /\[([^\]]+)\]\(([^)]+)\)/.test(content)
      const hasMarkdownLists = /^\s*[-*+]\s/.test(content) || /\n\s*[-*+]\s/.test(content)
      
      console.log(`🔤 Markdown Patterns Found:`)
      console.log(`   Headers (# ##): ${hasMarkdownHeaders ? '✅' : '❌'}`)
      console.log(`   Bold (**text**): ${hasMarkdownBold ? '✅' : '❌'}`)
      console.log(`   Italic (*text*): ${hasMarkdownItalic ? '✅' : '❌'}`)
      console.log(`   Links [text](url): ${hasMarkdownLinks ? '✅' : '❌'}`)
      console.log(`   Lists (- * +): ${hasMarkdownLists ? '✅' : '❌'}`)
      
      // Show first 500 characters
      console.log(`\n📄 First 500 characters of content:`)
      console.log('=' .repeat(60))
      console.log(content.substring(0, 500))
      if (content.length > 500) {
        console.log(`... (${content.length - 500} more characters)`)
      }
      console.log('=' .repeat(60))
      
      // Show full content for analysis
      console.log(`\n📄 FULL CONTENT FOR ANALYSIS:`)
      console.log('=' .repeat(60))
      console.log(content)
      console.log('=' .repeat(60))
      
      // Detect mixed content issues
      console.log(`\n🔄 Mixed Content Analysis:`)
      const hasHtmlAndMarkdown = hasHtmlTags && (hasMarkdownBold || hasMarkdownItalic || hasMarkdownHeaders || hasMarkdownLinks)
      console.log(`   Mixed HTML + Markdown: ${hasHtmlAndMarkdown ? '⚠️  YES - THIS IS THE PROBLEM!' : '✅ NO'}`)
      
      if (hasHtmlAndMarkdown) {
        console.log(`\n🛠️  RECOMMENDED FIX:`)
        console.log(`   The content contains both HTML tags and Markdown syntax.`)
        console.log(`   This causes rendering issues because the frontend expects pure HTML or pure Markdown.`)
        console.log(`   \n   Solutions:`)
        console.log(`   1. Convert all Markdown syntax to HTML`)
        console.log(`   2. Or convert all HTML to Markdown`)
        console.log(`   3. Or create a content processor to handle mixed format`)
        
        // Show specific mixed patterns found
        if (hasMarkdownBold) {
          const boldMatches = content.match(/\*\*(.*?)\*\*/g) || []
          console.log(`   \n   Found ${boldMatches.length} Markdown bold patterns:`)
          boldMatches.slice(0, 3).forEach((match, i) => {
            console.log(`     ${i + 1}. ${match} → should be <strong>${match.replace(/\*\*/g, '')}</strong>`)
          })
        }
      }
      
      // Check for special characters that might cause issues
      const specialChars = content.match(/[^\x00-\x7F]/g) || []
      console.log(`\n🔍 Special Characters Analysis:`)
      console.log(`   Non-ASCII character count: ${specialChars.length}`)
      
      if (specialChars.length > 0) {
        const uniqueSpecialChars = [...new Set(specialChars)].slice(0, 10)
        console.log(`   Sample unique special chars: ${uniqueSpecialChars.join(', ')}`)
      }
      
      // Check encoding issues
      const hasEncodingIssues = content.includes('â') || content.includes('Â') || content.includes('€')
      console.log(`   Potential encoding issues: ${hasEncodingIssues ? '⚠️  YES' : '✅ NO'}`)
      
      // Check line endings
      const hasWindowsLineEndings = content.includes('\r\n')
      const hasUnixLineEndings = content.includes('\n') && !content.includes('\r\n')
      console.log(`   Line endings: ${hasWindowsLineEndings ? 'Windows (\\r\\n)' : hasUnixLineEndings ? 'Unix (\\n)' : 'Mixed/None'}`)
      
      // Analyze content structure
      const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim())
      console.log(`\n📊 Content Structure:`)
      console.log(`   Paragraph count: ${paragraphs.length}`)
      
      if (paragraphs.length > 0) {
        console.log(`   First paragraph preview: "${paragraphs[0].substring(0, 100)}${paragraphs[0].length > 100 ? '...' : ''}"`)
      }
      
      // Check preview field
      console.log(`\n👀 Preview field:`)
      console.log(`   Length: ${(chapter.preview || '').length} characters`)
      if (chapter.preview) {
        console.log(`   Content: "${chapter.preview.substring(0, 200)}${chapter.preview.length > 200 ? '...' : ''}"`)
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the debug function
debugChapter().then(() => {
  console.log('\n✅ Debug analysis complete!')
  process.exit(0)
}).catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})