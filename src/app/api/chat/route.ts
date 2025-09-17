import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT } from '@/lib/system-prompt'
import { withRateLimit } from '@/lib/rate-limiter'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY not configured')
}

const anthropic = apiKey ? new Anthropic({ apiKey }) : null

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

export const POST = withRateLimit(async (request: NextRequest) => {
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
    const followupRegex = /\[FOLLOWUP_1\]\s*(.*?)\s*\[FOLLOWUP_2\]\s*(.*?)$/
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

    // Log to database for monitoring
    const { logApiError } = await import('@/lib/error-logger')
    await logApiError(request, error, 'Chat API failed', 500)

    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}, 'api') // Using 'api' rate limiter (30 requests per minute)