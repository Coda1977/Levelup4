export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  followups?: string[]
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
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