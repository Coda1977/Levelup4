const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixChapterFormatting() {
  try {
    console.log('🔍 Fetching "Your Number 1 Role" chapter...')
    
    const { data: chapters, error: fetchError } = await supabase
      .from('chapters')
      .select('*')
      .eq('title', 'Your Number 1 Role')
      .single()
    
    if (fetchError) {
      throw fetchError
    }
    
    if (!chapters) {
      console.log('Chapter not found.')
      return
    }
    
    console.log(`📖 Found chapter: ${chapters.title}`)
    
    // Properly formatted HTML content with proper paragraph breaks
    const properContent = `<blockquote>
<p>"Being a manager is as easy as riding a bike. Except the bike is on fire, you're on fire, everything is on fire, and you're in hell."</p>
</blockquote>

<p><strong>That's one manager having a bad day</strong>. But they're not wrong. <strong>Management is not a promotion. It's a career change.</strong> The skills that made you a great individual contributor? They're now mostly irrelevant. The work you loved doing? You'll barely touch it. That technical expertise you spent years building? You'll watch others use it while you sit in meetings.</p>

<p>If you want to succeed as a manager, you need to understand one fundamental truth.</p>

<h2>Your Number One Role</h2>

<p><strong>You are responsible for the work of your direct team.</strong></p>

<p>Not doing the work. Not hovering over the work. Being responsible for it getting done well through others.</p>

<p>You can be the smartest, most well-liked, hardworking manager ever. But if your team has a reputation for mediocre results, you're a mediocre manager. Period.</p>

<p>If someone on your team delivers poor work, you did a poor job developing them. If your team misses deadlines, that's your reputation getting damaged. Your team's output is your output.</p>

<h2>The Hack That Doesn't Work</h2>

<p>New managers try to game this system by taking on all the important work themselves. "If I do the critical stuff, at least that will be good."</p>

<p>It's understandable. It's also unsustainable.</p>

<p>The whole point is to get work done through other people, not over them or around them. You can't scale yourself. You can only scale your team.</p>

<h2>Two Jobs, Not One</h2>

<p>To achieve sustainable success through others, you need to master both sides:</p>

<p><strong>1. Make the work productive</strong><br/>
The "hard" stuff - creating goals and plans, rebuilding broken processes, inventing new tools, removing obstacles, clarifying priorities.</p>

<p><strong>2. Make the worker achieving</strong><br/>
The "soft" stuff - giving clear direction, coaching through challenges, building confidence, providing feedback, understanding what motivates each person.</p>

<p>Skip either side and you fail. Focus only on process? Your team disengages. Focus only on people? Nothing ships.</p>

<p>Most managers pick the side they're comfortable with and ignore the other. That's why most managers struggle.</p>

<h2>The Calendar Test</h2>

<p>Look at your calendar for next week. Count the hours you'll spend in meetings, 1:1s, reviews, and team discussions versus doing individual work.</p>

<p>If less than 60% of your time is spent on management activities (working through others), you're still playing individual contributor. You're riding that burning bike and wondering why everything around you is on fire.</p>

<h2>Try This Week</h2>

<p>Pick your most important project—the one keeping you up at night. Instead of diving in to "help," write down:</p>

<ol>
<li>What does wild success look like? (Specific metrics, dates, outcomes)</li>
<li>Who on your team could own this and grow from it?</li>
<li>What would they need from you to succeed?</li>
<li>When will you check progress? (Not constantly—pick 25%, 50%, 75% markers)</li>
</ol>

<p>Then delegate it. Completely. Not the easy parts while you keep the hard parts. All of it.</p>

<p>Yes, they might struggle. Yes, it might not be perfect. That's called learning.</p>

<p>Remember: <strong>You succeed when your team succeeds without you in the room.</strong></p>`
    
    // Update the chapter with properly formatted content
    const { error: updateError } = await supabase
      .from('chapters')
      .update({ content: properContent })
      .eq('id', chapters.id)
    
    if (updateError) {
      console.log(`❌ Error updating: ${updateError.message}`)
    } else {
      console.log(`✅ Successfully reformatted chapter with proper paragraph breaks`)
      console.log(`📝 Content now has proper HTML structure with:`)
      console.log(`   - Separated paragraphs`)
      console.log(`   - Proper H2 headers`)
      console.log(`   - Formatted blockquote`)
      console.log(`   - Ordered list for "Try This Week"`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the fix
fixChapterFormatting()