import { mockCategories, mockChapters } from '../utils/test-utils'

// Create a mock fetch function
export const createMockFetch = (responses: Record<string, any>) => {
  return jest.fn().mockImplementation((url: string, options?: any) => {
    const method = options?.method || 'GET'
    const key = `${method} ${url}`

    if (responses[key]) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responses[key]),
        status: 200,
      })
    }

    if (responses[url]) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responses[url]),
        status: 200,
      })
    }

    return Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: 'Not found' }),
      status: 404,
    })
  })
}

// Mock API responses
const mockApiResponses = {
  '/api/admin/chapters': {
    categories: mockCategories,
    chapters: mockChapters,
  },
  'GET /api/admin/chapters': {
    categories: mockCategories,
    chapters: mockChapters,
  },
  'POST /api/admin/chapters': {
    success: true,
    chapter: {
      ...mockChapters[0],
      id: 'new-chapter-id',
      title: 'New Chapter',
    },
  },
  'PUT /api/admin/chapters?id=ch-1': {
    success: true,
    chapter: {
      ...mockChapters[0],
      title: 'Updated Chapter',
    },
  },
  'DELETE /api/admin/chapters?id=ch-1': {
    success: true,
  },
  'PATCH /api/admin/chapters': {
    success: true,
  },
}

// Create a mock fetch function
export const mockFetch = createMockFetch(mockApiResponses)

// Helper function to setup fetch mock
export const setupFetchMock = (customResponses: Record<string, any> = {}) => {
  const responses = { ...mockApiResponses, ...customResponses }
  global.fetch = createMockFetch(responses)
  return global.fetch
}

// Helper function to create error responses
export const createErrorResponse = (message: string, status: number = 500) => ({
  ok: false,
  status,
  json: () => Promise.resolve({ error: message }),
})

// Mock specific API calls for different scenarios
export const mockApiCallSuccess = (url: string, data: any) => {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(data),
  })
}

export const mockApiCallError = (url: string, error: string, status: number = 500) => {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ error }),
  })
}

// Mock fetch for network errors
export const mockNetworkError = () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
}

// Reset fetch mock
export const resetFetchMock = () => {
  if (global.fetch && 'mockClear' in global.fetch) {
    (global.fetch as jest.Mock).mockClear()
  }
}