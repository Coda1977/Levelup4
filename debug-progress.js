const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://exxildftqhnlupxdlqfn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4eGlsZGZ0cWhubHVweGRscWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYwNzAwOTAsImV4cCI6MjA1MTY0NjA5MH0.lIjwB6K5cM_MmphOlVUvdDvQkXx4FkyRf7sJfLe5HHc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugProgress() {
  console.log('🔍 Starting Progress Debug...\n')

  // 1. Check if we can connect
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) {
    console.error('❌ Error getting session:', sessionError)
    return
  }

  if (!session) {
    console.log('❌ No active session. Please log in first.')
    return
  }

  const userId = session.user.id
  console.log('✅ Found user:', session.user.email)
  console.log('   User ID:', userId)
  console.log('')

  // 2. Check user_progress table
  console.log('📊 Checking user_progress table...')
  const { data: progress, error: progressError } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)

  if (progressError) {
    console.error('❌ Error fetching progress:', progressError)
  } else {
    console.log(`✅ Found ${progress.length} completed chapters`)
    if (progress.length > 0) {
      console.log('   Completed chapter IDs:')
      progress.forEach(p => {
        console.log(`   - ${p.chapter_id} (completed at: ${p.completed_at})`)
      })
    }
  }
  console.log('')

  // 3. Get all chapters to show completion status
  console.log('📚 Fetching all chapters...')
  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('id, title')
    .order('display_order')

  if (chaptersError) {
    console.error('❌ Error fetching chapters:', chaptersError)
  } else {
    console.log(`✅ Found ${chapters.length} total chapters`)

    const completedIds = progress ? progress.map(p => p.chapter_id) : []

    console.log('\n📈 Chapter Completion Status:')
    chapters.forEach(chapter => {
      const isCompleted = completedIds.includes(chapter.id)
      const status = isCompleted ? '✅' : '⬜'
      console.log(`   ${status} ${chapter.title}`)
    })

    const completionRate = ((completedIds.length / chapters.length) * 100).toFixed(1)
    console.log(`\n   Progress: ${completedIds.length}/${chapters.length} chapters (${completionRate}%)`)
  }

  // 4. Test inserting a dummy progress record
  console.log('\n🧪 Testing insert capability...')
  if (chapters && chapters.length > 0) {
    // Find first uncompleted chapter
    const completedIds = progress ? progress.map(p => p.chapter_id) : []
    const uncompletedChapter = chapters.find(c => !completedIds.includes(c.id))

    if (uncompletedChapter) {
      console.log(`   Attempting to mark "${uncompletedChapter.title}" as complete...`)

      const { data: insertData, error: insertError } = await supabase
        .from('user_progress')
        .insert({
          user_id: userId,
          chapter_id: uncompletedChapter.id
        })
        .select()

      if (insertError) {
        console.error('   ❌ Insert failed:', insertError.message)
        if (insertError.code === '23505') {
          console.log('   ℹ️  Chapter was already marked as complete')
        }
      } else {
        console.log('   ✅ Successfully marked chapter as complete!')
        console.log('   Data:', insertData)

        // Clean up test data
        console.log('   🧹 Cleaning up test data...')
        const { error: deleteError } = await supabase
          .from('user_progress')
          .delete()
          .eq('user_id', userId)
          .eq('chapter_id', uncompletedChapter.id)

        if (deleteError) {
          console.error('   ❌ Cleanup failed:', deleteError)
        } else {
          console.log('   ✅ Test data cleaned up')
        }
      }
    } else {
      console.log('   ℹ️  All chapters already completed!')
    }
  }

  console.log('\n✨ Debug complete!')
}

debugProgress().catch(console.error)