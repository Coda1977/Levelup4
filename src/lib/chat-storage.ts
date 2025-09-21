import { Conversation, LocalUserSession } from '@/types/chat'

const STORAGE_KEY = 'levelup_chat_session'

// Generate a unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Get or create user session
export function getUserSession(): LocalUserSession {
  if (typeof window === 'undefined') {
    return {
      userId: '',
      completedChapters: [],
      conversations: [],
      preferences: {}
    }
  }

  const stored = localStorage.getItem(STORAGE_KEY)

  if (stored) {
    try {
      const session = JSON.parse(stored)
      // Keep dates as strings for consistency
      return session
    } catch (e) {
      // Invalid stored data, return fresh session
    }
  }

  // Create new session
  const newSession: LocalUserSession = {
    userId: generateId(),
    completedChapters: [],
    conversations: [],
    preferences: {}
  }

  saveUserSession(newSession)
  return newSession
}

// Save user session
export function saveUserSession(session: LocalUserSession): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

// Add or update conversation
export function saveConversation(conversation: Conversation): void {
  const session = getUserSession()
  const existingIndex = session.conversations.findIndex(c => c.id === conversation.id)

  if (existingIndex >= 0) {
    session.conversations[existingIndex] = conversation
  } else {
    session.conversations.unshift(conversation) // Add to beginning
  }

  saveUserSession(session)
}

// Delete conversation
export function deleteConversation(conversationId: string): void {
  const session = getUserSession()
  session.conversations = session.conversations.filter(c => c.id !== conversationId)
  saveUserSession(session)
}

// Get conversation by ID
export function getConversation(conversationId: string): Conversation | null {
  const session = getUserSession()
  return session.conversations.find(c => c.id === conversationId) || null
}

// Update completed chapters
export function updateCompletedChapters(chapterIds: string[]): void {
  const session = getUserSession()
  session.completedChapters = chapterIds
  saveUserSession(session)
}

// Generate conversation title from first message
export function generateConversationTitle(firstMessage: string): string {
  // Truncate to 50 chars and clean up
  const title = firstMessage
    .replace(/\n/g, ' ')
    .trim()
    .substring(0, 50)

  return title.length === 50 ? title + '...' : title
}