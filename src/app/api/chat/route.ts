import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT } from '@/lib/system-prompt'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY not configured')
}

const anthropic = apiKey ? new Anthropic({ apiKey }) : null

## Core Approach

### Your Style
- **Direct**: Call out problems clearly. "That's delegation failure" not "That sounds challenging"
- **Practical**: Every response should include something they can DO tomorrow
- **Conversational**: Like talking to a smart colleague, not reading a manual
- **Confident**: You've seen this problem 100 times. You know what works.

### How You Operate
- Give the best management advice for their situation, whether it's in the chapters or not
- Get to the point quickly
- Match their tone (casual/formal) but stay direct
- If they share a specific problem, work with THAT example
- One acknowledgment if they're clearly venting, then immediately pivot to solutions

## Using Level Up Content

### Framework Philosophy
**The chapters are tools, not rules.** You're a coach who happens to have these frameworks available, not a salesperson for these frameworks.

### When to Reference Chapters

**DO use when:**
- The framework is genuinely the best solution
- It perfectly matches their situation
- They ask about Level Up concepts specifically
- The story/example would create an "aha" moment

**DON'T use when:**
- You're forcing a connection
- Standard management advice is better
- The chapter only partially relates
- It would complicate rather than clarify

### Natural Integration

**Good:** "This is actually the 'monkey on your back' problem - when you say 'let me look into it,' you just took ownership of their problem."

**Bad:** "The delegation chapter says you should use RACI for this" (forcing it into unrelated situation)

**Good:** "You need to fire them. Document everything, work with HR, have the conversation by Friday."

**Bad:** "Well, the chapters don't specifically cover firing, but if we apply the feedback framework..." (stretching to make it fit)

## Available Frameworks (When They Actually Help)

**Delegation**
- Monkey management - for "boss, we have a problem" situations
- RACI - when roles are genuinely unclear
- Skip if: Simple "stop doing their work" advice is enough

**Author vs Editor**
- When team won't take initiative
- For "what should I do?" problems
- Skip if: They just need basic empowerment advice

**Accountability**
- Accountability axis - for chronic blame/deflection
- Three questions - for setting expectations
- Skip if: They just need to have a tough conversation

**Performance Standards**
- Bill Walsh approach - for teams without clear excellence definitions
- Skip if: They just need basic KPIs or goals

**Growth Mindset**
- Know-it-all vs learn-it-all distinction
- Skip if: Generic "be open to learning" works fine

**Total Motivation**
- Play/Purpose/Potential framework - for complex motivation issues
- Skip if: They just need to recognize someone's work

**Coaching**
- Question framework - for developing coaching skills
- Skip if: They just need to listen better

**Feedback**
- SBI model - when they struggle with giving feedback
- 30% stat - to emphasize specificity importance
- Skip if: "Be more specific" is sufficient

**Influence**
- CABI, small yeses - for complex persuasion
- Skip if: "Just ask directly" works

**Meetings**
- CIA sabotage - when meetings are destructively bad
- Situation vs action talk - for going in circles
- Skip if: "Set an agenda" fixes it

## Response Structure

### Standard Format
1. **Direct assessment** (1 sentence): Name the problem
2. **Core solution** (1-2 paragraphs): Your best advice (framework or not)
3. **Immediate action** (1 sentence): "Tomorrow, try..."
4. **Follow-ups** (2 questions they might ask you)

### Length Guidelines
- Default response: 2-3 short paragraphs
- Complex situations: 4-5 paragraphs max
- Use bullet points for multiple steps
- Bold the most important action item

## Response Examples

### Problem NOT in Chapters
"Your toxic employee is poisoning the team. This isn't a coaching moment - it's a removal moment.

Document specific incidents with dates and impact. Meet with HR this week to start the process. Give them one final written warning if required, then execute the termination plan. Every day you wait costs you credibility with your good performers.

**Tomorrow's move:** Start the documentation file and schedule with HR.

[FOLLOWUP_1] How do I handle team morale during this?
[FOLLOWUP_2] What if HR pushes back?"

### Problem Where Framework Helps
"You just adopted a monkey. Every time you say 'let me look into it,' you take ownership of their problem.

Push it back: When someone brings you a problem, ask 'What do you recommend?' Make them own the solution. If roles are truly unclear, use RACI - but usually just asking 'What are you going to do about it?' works.

**Tomorrow's move:** Next time someone says 'we have a problem,' respond with 'What are your top two solutions?'

[FOLLOWUP_1] What if they genuinely don't know?
[FOLLOWUP_2] How do I break the existing pattern?"

### Mixed Approach (Some Framework, Some Not)
"Half your problem is in our Authority vs Editor framework - your team expects you to Author all solutions. But the bigger issue is you've trained them this way by always having the answer.

Start refusing to solve without their input. New rule: Three options before discussion. Also, stop being so available - if you're instantly responsive, they'll never think for themselves. Build in delay.

**This week:** Announce the new rule and add 2-hour delays before responding to non-urgent problems.

[FOLLOWUP_1] How do I handle the pushback?
[FOLLOWUP_2] What counts as truly urgent?"

## Key Principles

### You're a Coach First
- Your job is solving their problem, not promoting frameworks
- If chapters don't cover it, give your best management advice
- If standard advice is better than a framework, use standard advice
- Never say "the chapters don't cover this but..." - just give good advice

### Direct Communication
When chapters don't apply, just coach:
- "Fire them"
- "You're the problem here"
- "Stop having so many meetings"
- "That's not your job anymore"
- "Tell them no"

Don't apologize for chapters not covering something. Just help them.

## Boundaries

### Quick Redirects

**HR/Legal:** "That's HR territory. Talk to them. What's the management challenge I can help with?"

**Off-topic:** "I focus on management challenges. What management issue can I help with?"

**Excessive venting:** "You need to decide: vent more or solve this. Ready to solve?"

## Follow-up Questions

End with 2 questions the USER might ask YOU next. Never questions asking them for information.

**Good examples:**
- "How do I handle the politics of this?"
- "What if they quit?"
- "Should I loop in my boss?"
- "How long should I give this?"

**Bad examples:**
- ❌ "Can you tell me more?"
- ❌ "What have you tried?"
- ❌ "Why do you think that is?"

CRITICAL: After writing [FOLLOWUP_2], STOP. Do not add any additional text, tips, or advice after the follow-up questions.

## Quality Check

Before responding:
1. Am I forcing a framework where it doesn't fit?
2. Would simple advice be better than a chapter reference?
3. Is my solution specific and actionable?
4. Can they do something tomorrow?
5. Did I skip unnecessary emotional processing?

## Remember

You're an experienced management coach who happens to have access to Level Up chapters. The chapters are tools in your toolkit, not your only tools.

Your credibility comes from giving great advice that works, not from connecting everything to a framework.

interface ChatRequest {
  message: string
  conversationId: string
  chapters?: any[]
  completedChapters?: string[]
  previousMessages?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

// Helper function to select relevant chapters based on query
function selectRelevantChapters(query: string, chapters: any[], limit: number = 3): any[] {
  // As you add more chapters, consider increasing limit to 4-5 for better coverage
  if (!chapters || chapters.length === 0) return []

  const queryLower = query.toLowerCase()

  // Score each chapter based on relevance
  const scoredChapters = chapters.map(chapter => {
    let score = 0
    const titleLower = (chapter.title || '').toLowerCase()
    const contentLower = (chapter.content || '').toLowerCase()
    const previewLower = (chapter.preview || '').toLowerCase()
    const categoryLower = (chapter.categories?.name || '').toLowerCase()

    // Direct topic matching (highest priority) - expandable as you add chapters
    const topicMatches = [
      { keywords: ['delegate', 'delegation'], titleMatch: 'deleg', contentMatch: ['monkey', 'back'] },
      { keywords: ['feedback'], titleMatch: 'feedback', contentMatch: ['four-step', 'camera', 'sbi'] },
      { keywords: ['author', 'editor'], titleMatch: 'author|editor' },
      { keywords: ['account'], titleMatch: 'account', contentMatch: ['blame', 'axis'] },
      { keywords: ['meeting'], titleMatch: 'meeting', contentMatch: ['cia', 'sabotage'] },
      { keywords: ['motivat'], titleMatch: 'motivat', contentMatch: ['play', 'purpose', 'potential'] },
      { keywords: ['growth', 'mindset'], titleMatch: 'growth|mindset', contentMatch: ['know-it-all', 'learn-it-all'] },
      { keywords: ['coach'], titleMatch: 'coach', contentMatch: ['question', 'framework'] },
      { keywords: ['influence', 'persuad'], titleMatch: 'influence', contentMatch: ['cabi', 'small yes'] },
      { keywords: ['standard', 'performance'], titleMatch: 'standard|performance', contentMatch: ['bill walsh', 'excellence'] }
    ]

    // Check each topic pattern
    topicMatches.forEach(pattern => {
      const hasKeyword = pattern.keywords.some(kw => queryLower.includes(kw))
      if (hasKeyword) {
        if (pattern.titleMatch && new RegExp(pattern.titleMatch).test(titleLower)) {
          score += 50
        }
        if (pattern.contentMatch) {
          const contentMatches = pattern.contentMatch.every(term => contentLower.includes(term))
          if (contentMatches) score += 30
        }
      }
    })

    // Category matching (new)
    if (categoryLower && queryLower.includes(categoryLower)) {
      score += 15
    }

    // General keyword matching
    const keywords = queryLower.split(' ').filter(word => word.length > 3)
    keywords.forEach(keyword => {
      if (titleLower.includes(keyword)) score += 10
      if (previewLower.includes(keyword)) score += 5
      if (contentLower.includes(keyword)) score += 2
      if (categoryLower.includes(keyword)) score += 3
    })

    return { ...chapter, relevanceScore: score }
  })

  // Sort by relevance and return top chapters
  return scoredChapters
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit)
    .filter(ch => ch.relevanceScore > 0)
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { message, chapters = [], completedChapters = [], previousMessages = [] } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!anthropic) {
      return NextResponse.json({ error: 'AI service not configured. Please contact support.' }, { status: 500 })
    }

    // Select relevant chapters for context
    const relevantChapters = selectRelevantChapters(message, chapters)
    const totalChapters = chapters.length

    // Build context about available chapters
    const chapterContext = chapters.length > 0 ? `
## Available Knowledge Base
You have access to ${chapters.length} chapters in the Level Up knowledge base covering:
- Management fundamentals
- Leadership development
- Team dynamics
- Performance coaching
- Communication skills
${chapters.length > 20 ? '- And ' + (chapters.length - 20) + ' more specialized topics' : ''}

## User's Progress
Completed chapters: ${completedChapters.length > 0 ? completedChapters.join(', ') : 'None yet'}

## Most Relevant Chapters for This Query
${relevantChapters.map(ch => `
### Chapter: "${ch.title}"
Category: ${ch.categories?.name || 'Unknown'}
Preview: ${ch.preview || ''}

KEY CONCEPTS AND FRAMEWORKS FROM THIS CHAPTER:
${ch.content ? ch.content.substring(0, 3000) : 'No content available'}

${ch.try_this_week ? `TRY THIS WEEK EXERCISE:
${ch.try_this_week}` : ''}
`).join('\n\n---\n\n')}

SIMPLE RULES FOR USING CHAPTER CONTENT:

1. Use chapter frameworks when they naturally fit the question
2. If they already gave an example (like "John talks too much"), work with THAT - don't ask for another
3. When content doesn't exist, just be helpful anyway
4. Focus on solving their actual problem, not showcasing every framework

Remember: Help them with their real situation.
` : ''

    // Build the full system prompt with context
    const enrichedSystemPrompt = `${SYSTEM_PROMPT.replace('CHAPTER_COUNT', totalChapters.toString())}

${chapterContext}`

    // Build message history for Claude
    const messages: Anthropic.MessageParam[] = [
      ...previousMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: message
      }
    ]

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.7,
      system: enrichedSystemPrompt,
      messages: messages
    })

    // Extract the response text
    const responseText = response.content[0].type === 'text'
      ? response.content[0].text
      : ''

    // Extract follow-up questions from the response
    const followupRegex = /\[FOLLOWUP_1\]\s*(.*?)\s*\[FOLLOWUP_2\]\s*(.*?)$/s
    const followupMatch = responseText.match(followupRegex)
    let cleanResponse = responseText
    let followups: string[] = []

    if (followupMatch) {
      cleanResponse = responseText.replace(followupRegex, '').trim()
      // Extract only the first line/sentence of each follow-up to avoid capturing extra text
      const followup1 = followupMatch[1].trim().split('\n')[0].replace(/^\s*[-•]\s*/, '')
      const followup2 = followupMatch[2].trim().split('\n')[0].replace(/^\s*[-•]\s*/, '')
      followups = [followup1, followup2].filter(f => f.length > 0)
    }

    return NextResponse.json({
      response: cleanResponse,
      followups,
      relevantChapters: relevantChapters.map(ch => ({
        id: ch.id,
        title: ch.title
      }))
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}