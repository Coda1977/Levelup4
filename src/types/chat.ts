export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  followups?: string[]
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

export interface LocalUserSession {
  userId: string
  completedChapters: string[]
  conversations: Conversation[]
  preferences: {
    theme?: 'light' | 'dark'
    fontSize?: 'small' | 'medium' | 'large'
  }
}