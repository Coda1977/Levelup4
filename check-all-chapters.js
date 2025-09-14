const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkAllChapters() {
  try {
    console.log('🔍 Fetching all chapters to check formatting...\n')
    
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
    
    console.log(`📚 Found ${chapters.length} chapters to analyze\n`)
    console.log('=' .repeat(80))
    
    const issues = []
    
    for (const chapter of chapters) {
      const content = chapter.content
      
      // Count paragraph tags
      const pTagMatches = content.match(/<p[^>]*>/g) || []
      const pTagCount = pTagMatches.length
      
      // Count heading tags
      const headingMatches = content.match(/<h[1-6][^>]*>/g) || []
      const headingCount = headingMatches.length
      
      // Count line breaks
      const brTagCount = (content.match(/<br\s*\/?>/g) || []).length
      
      // Check content length vs structure
      const contentLength = content.length
      const avgCharsPerParagraph = pTagCount > 0 ? Math.floor(contentLength / pTagCount) : contentLength
      
      // Detect potential issues
      const potentialIssues = []
      
      // Issue 1: Very few paragraphs for long content
      if (contentLength > 1500 && pTagCount < 5) {
        potentialIssues.push(`⚠️  Very few paragraphs (${pTagCount}) for ${contentLength} chars`)
      }
      
      // Issue 2: Average paragraph too long
      if (avgCharsPerParagraph > 1000 && pTagCount > 0) {
        potentialIssues.push(`⚠️  Very long paragraphs (avg ${avgCharsPerParagraph} chars)`)
      }
      
      // Issue 3: No headings in long content
      if (contentLength > 2000 && headingCount === 0) {
        potentialIssues.push(`⚠️  No headings in long content`)
      }
      
      // Issue 4: Everything in 1-2 paragraphs
      if (contentLength > 1000 && pTagCount <= 2) {
        potentialIssues.push(`🚨 CRITICAL: All content in ${pTagCount} paragraph(s)`)
      }
      
      // Report findings
      console.log(`\n📖 ${chapter.title}`)
      console.log(`   Length: ${contentLength} chars`)
      console.log(`   Structure: ${pTagCount} <p> tags, ${headingCount} headings, ${brTagCount} <br> tags`)
      console.log(`   Avg chars/paragraph: ${avgCharsPerParagraph}`)
      
      if (potentialIssues.length > 0) {
        console.log(`   Issues:`)
        potentialIssues.forEach(issue => {
          console.log(`      ${issue}`)
        })
        issues.push({
          title: chapter.title,
          id: chapter.id,
          issues: potentialIssues,
          pTagCount,
          contentLength
        })
      } else {
        console.log(`   ✅ Formatting looks good`)
      }
    }
    
    console.log('\n' + '=' .repeat(80))
    console.log('📊 SUMMARY')
    console.log('=' .repeat(80))
    
    if (issues.length === 0) {
      console.log('✅ All chapters have proper formatting!')
    } else {
      console.log(`\n⚠️  ${issues.length} chapter(s) may need formatting fixes:\n`)
      
      // Prioritize critical issues
      const critical = issues.filter(i => i.issues.some(issue => issue.includes('CRITICAL')))
      const warnings = issues.filter(i => !i.issues.some(issue => issue.includes('CRITICAL')))
      
      if (critical.length > 0) {
        console.log('🚨 CRITICAL (need immediate fixing):')
        critical.forEach(chapter => {
          console.log(`   - ${chapter.title} (${chapter.pTagCount} paragraphs for ${chapter.contentLength} chars)`)
        })
      }
      
      if (warnings.length > 0) {
        console.log('\n⚠️  WARNINGS (should review):')
        warnings.forEach(chapter => {
          console.log(`   - ${chapter.title}`)
          chapter.issues.forEach(issue => {
            console.log(`     ${issue}`)
          })
        })
      }
      
      console.log('\n💡 Recommendation:')
      if (critical.length > 0) {
        console.log('   Run a formatting fix on the critical chapters to add proper paragraph breaks.')
        console.log('   These chapters likely had their formatting collapsed during editing.')
      } else {
        console.log('   Review the warned chapters to ensure they have appropriate structure.')
      }
    }
    
    console.log('\n' + '=' .repeat(80))
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the check
checkAllChapters()