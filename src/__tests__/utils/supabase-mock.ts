/**
 * Mock Supabase client for testing
 * Provides in-memory database simulation for tests
 */

interface MockUser {
  id: string
  email: string
  user_metadata?: any
}

interface MockSession {
  user: MockUser
  access_token: string
}

interface MockProfile {
  id: string
  first_name?: string
  last_name?: string
  is_admin: boolean
  created_at: string
  updated_at: string
}

interface MockProgress {
  id: string
  user_id: string
  chapter_id: string
  completed_at: string
}

interface MockConversation {
  id: string
  user_id: string
  title: string
  selected_chapters: any[]
  is_archived: boolean
  is_starred: boolean
  created_at: string
  updated_at: string
}

interface MockMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  is_complete: boolean
  followups?: string[]
  relevant_chapters?: any[]
  timestamp: string
}

class MockSupabaseClient {
  private users: Map<string, MockUser> = new Map()
  private profiles: Map<string, MockProfile> = new Map()
  private sessions: Map<string, MockSession> = new Map()
  private progress: MockProgress[] = []
  private conversations: MockConversation[] = []
  private messages: MockMessage[] = []
  private currentSession: MockSession | null = null

  auth = {
    signUp: jest.fn(async ({ email, password, options }: any) => {
      const userId = `mock_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Check for duplicate email
      const existingUser = Array.from(this.users.values()).find(u => u.email === email)
      if (existingUser) {
        return {
          data: { user: existingUser, session: null },
          error: null
        }
      }

      const user: MockUser = {
        id: userId,
        email,
        user_metadata: options?.data || {}
      }

      this.users.set(userId, user)

      // Simulate trigger creating profile
      setTimeout(() => {
        this.profiles.set(userId, {
          id: userId,
          first_name: options?.data?.first_name || '',
          last_name: options?.data?.last_name || '',
          is_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }, 100)

      return { data: { user, session: null }, error: null }
    }),

    signInWithPassword: jest.fn(async ({ email, password }: any) => {
      const user = Array.from(this.users.values()).find(u => u.email === email)

      if (!user) {
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' }
        }
      }

      if (password === 'WrongPassword123!') {
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' }
        }
      }

      const session: MockSession = {
        user,
        access_token: `mock_token_${Date.now()}`
      }

      this.sessions.set(user.id, session)
      this.currentSession = session

      return { data: { user, session }, error: null }
    }),

    getSession: jest.fn(async () => {
      return { data: { session: this.currentSession }, error: null }
    }),

    getUser: jest.fn(async () => {
      if (!this.currentSession) {
        return {
          data: { user: null },
          error: { name: 'AuthSessionMissingError', message: 'Auth session missing!' }
        }
      }
      return { data: { user: this.currentSession.user }, error: null }
    }),

    signOut: jest.fn(async () => {
      this.currentSession = null
      return { error: null }
    }),

    resetPasswordForEmail: jest.fn(async (email: string, options: any) => {
      return { error: null }
    })
  }

  from = (table: string) => {
    return {
      select: jest.fn(() => this.fromChain(table)),
      insert: jest.fn((data: any) => this.fromChain(table, 'insert', data)),
      update: jest.fn((data: any) => this.fromChain(table, 'update', data)),
      delete: jest.fn(() => this.fromChain(table, 'delete'))
    }
  }

  private fromChain = (table: string, operation?: string, data?: any) => {
    let result: any = null
    let error: any = null
    let filters: any = {}

    const chain = {
      select: jest.fn((columns?: string) => chain),
      insert: jest.fn((insertData: any) => {
        data = insertData
        operation = 'insert'
        return chain
      }),
      update: jest.fn((updateData: any) => {
        data = updateData
        operation = 'update'
        return chain
      }),
      delete: jest.fn(() => {
        operation = 'delete'
        return chain
      }),
      eq: jest.fn((column: string, value: any) => {
        filters[column] = value
        return chain
      }),
      order: jest.fn((column: string, options?: any) => chain),
      limit: jest.fn((count: number) => chain),
      single: jest.fn(() => chain),
      execute: jest.fn(async () => this.executeOperation(table, operation, data, filters))
    }

    // Auto-execute at the end of chain
    const originalChain = chain
    const proxy = new Proxy(chain, {
      get(target, prop) {
        if (prop === 'then' || prop === 'catch' || prop === 'finally') {
          const promise = target.execute()
          return promise[prop].bind(promise)
        }
        return target[prop as keyof typeof target]
      }
    })

    return proxy
  }

  private executeOperation = async (table: string, operation?: string, data?: any, filters?: any) => {
    let result: any = null
    let error: any = null

    switch (table) {
      case 'user_profiles':
        if (operation === 'select') {
          if (filters.id) {
            const profile = this.profiles.get(filters.id)
            result = profile ? [profile] : []
          } else {
            result = Array.from(this.profiles.values())
          }
        }
        break

      case 'user_progress':
        if (operation === 'insert') {
          // Check for duplicate
          const existing = this.progress.find(
            p => p.user_id === data.user_id && p.chapter_id === data.chapter_id
          )
          if (existing) {
            error = { code: '23505', message: 'Unique violation' }
          } else {
            const progress: MockProgress = {
              id: `progress_${Date.now()}`,
              user_id: data.user_id,
              chapter_id: data.chapter_id,
              completed_at: new Date().toISOString()
            }
            this.progress.push(progress)
            result = [progress]
          }
        } else if (operation === 'select') {
          result = this.progress.filter(p =>
            (!filters.user_id || p.user_id === filters.user_id)
          )
        } else if (operation === 'delete') {
          this.progress = this.progress.filter(p =>
            !((!filters.user_id || p.user_id === filters.user_id) &&
              (!filters.chapter_id || p.chapter_id === filters.chapter_id))
          )
          result = []
        }
        break

      case 'conversations':
        if (operation === 'insert') {
          const conversation: MockConversation = {
            id: `conv_${Date.now()}`,
            user_id: data.user_id,
            title: data.title,
            selected_chapters: data.selected_chapters || [],
            is_archived: data.is_archived || false,
            is_starred: data.is_starred || false,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString()
          }
          this.conversations.push(conversation)
          result = [conversation]
        } else if (operation === 'select') {
          result = this.conversations.filter(c =>
            (!filters.user_id || c.user_id === filters.user_id) &&
            (!filters.id || c.id === filters.id) &&
            (filters.is_archived === undefined || c.is_archived === filters.is_archived) &&
            (filters.is_starred === undefined || c.is_starred === filters.is_starred)
          )
        } else if (operation === 'update') {
          const conv = this.conversations.find(c => c.id === filters.id)
          if (conv) {
            Object.assign(conv, data)
            result = [conv]
          }
        } else if (operation === 'delete') {
          // Cascade delete messages
          this.messages = this.messages.filter(m => m.conversation_id !== filters.id)
          this.conversations = this.conversations.filter(c => c.id !== filters.id)
          result = []
        }
        break

      case 'messages':
        if (operation === 'insert') {
          const message: MockMessage = {
            id: `msg_${Date.now()}`,
            conversation_id: data.conversation_id,
            role: data.role,
            content: data.content,
            is_complete: data.is_complete !== false,
            followups: data.followups,
            relevant_chapters: data.relevant_chapters,
            timestamp: new Date().toISOString()
          }
          this.messages.push(message)
          result = [message]
        } else if (operation === 'select') {
          result = this.messages.filter(m =>
            (!filters.conversation_id || m.conversation_id === filters.conversation_id)
          )
          // Include nested conversation data if requested
          if (result.length > 0) {
            result = result.map(m => ({
              ...m,
              conversations: this.conversations.find(c => c.id === m.conversation_id)
            }))
          }
        } else if (operation === 'update') {
          const msg = this.messages.find(m => m.id === filters.id)
          if (msg) {
            Object.assign(msg, data)
            result = [msg]
          }
        } else if (operation === 'delete') {
          this.messages = this.messages.filter(m => m.conversation_id !== filters.conversation_id)
          result = []
        }
        break

      case 'chapters':
        // Mock some chapters for testing
        result = [
          { id: 'chapter-1', title: 'Chapter 1' },
          { id: 'chapter-2', title: 'Chapter 2' },
          { id: 'chapter-3', title: 'Chapter 3' }
        ]
        break

      default:
        result = []
    }

    // Handle single() modifier
    if (result && Array.isArray(result) && result.length === 1 &&
        (operation === 'select' || operation === 'insert' || operation === 'update')) {
      result = result[0]
    }

    return { data: result, error, count: Array.isArray(result) ? result.length : null }
  }
}

export const createMockSupabaseClient = () => new MockSupabaseClient()