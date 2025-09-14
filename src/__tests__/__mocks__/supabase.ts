import { mockCategories, mockChapters } from '../utils/test-utils'

// Mock Supabase client
export const createMockSupabaseClient = () => {
  const mockFrom = (table: string) => {
    const queries = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    }

    // Mock data responses based on table
    const mockData = {
      categories: mockCategories,
      chapters: mockChapters,
    }

    // Set up default successful responses
    queries.select.mockImplementation((columns?: string) => {
      return {
        ...queries,
        then: (callback: (result: any) => void) => {
          const data = table === 'chapters' && columns?.includes('categories')
            ? mockChapters.map(ch => ({
                ...ch,
                categories: mockCategories.find(cat => cat.id === ch.category_id)
              }))
            : mockData[table as keyof typeof mockData] || []

          return callback({ data, error: null })
        }
      }
    })

    queries.insert.mockImplementation((data: any) => ({
      ...queries,
      then: (callback: (result: any) => void) => {
        const newRecord = { ...data, id: `new-${Date.now()}` }
        return callback({ data: newRecord, error: null })
      }
    }))

    queries.update.mockImplementation((data: any) => ({
      ...queries,
      then: (callback: (result: any) => void) => {
        return callback({ data, error: null })
      }
    }))

    queries.delete.mockImplementation(() => ({
      ...queries,
      then: (callback: (result: any) => void) => {
        return callback({ error: null })
      }
    }))

    return queries
  }

  return {
    from: mockFrom,
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  }
}

const mockClient = createMockSupabaseClient()
const mockAdminClient = createMockSupabaseClient()

export const supabase = mockClient
export const supabaseAdmin = mockAdminClient

export default mockClient