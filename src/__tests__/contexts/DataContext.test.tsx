import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { DataProvider, useData } from '@/contexts/DataContext'
import { createMockFetch, mockFetchSuccess, mockFetchError, mockChapters, mockCategories } from '../utils/test-utils'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <DataProvider>{children}</DataProvider>
)

describe('DataContext', () => {
  let mockFetch: jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()
    mockFetch = createMockFetch({
      '/api/admin/chapters': mockFetchSuccess({ chapters: mockChapters }),
      '/api/admin/chapters?categories=true': mockFetchSuccess({ categories: mockCategories }),
    })
    global.fetch = mockFetch
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should provide initial empty state', () => {
      const { result } = renderHook(() => useData(), { wrapper })

      expect(result.current.chapters).toEqual([])
      expect(result.current.categories).toEqual([])
      expect(result.current.chaptersLoading).toBe(false)
      expect(result.current.categoriesLoading).toBe(false)
      expect(result.current.chaptersError).toBeNull()
      expect(result.current.categoriesError).toBeNull()
    })

    it('should throw error when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useData())
      }).toThrow('useData must be used within a DataProvider')

      consoleSpy.mockRestore()
    })
  })

  describe('fetchChaptersAndCategories', () => {
    it('should fetch chapters and categories successfully', async () => {
      const { result } = renderHook(() => useData(), { wrapper })

      await act(async () => {
        await result.current.fetchChaptersAndCategories()
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/chapters')
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/chapters?categories=true')
      expect(result.current.chapters).toEqual(mockChapters)
      expect(result.current.categories).toEqual(mockCategories)
      expect(result.current.chaptersLoading).toBe(false)
      expect(result.current.categoriesLoading).toBe(false)
    })

    it('should set loading state during fetch', async () => {
      const { result } = renderHook(() => useData(), { wrapper })

      act(() => {
        result.current.fetchChaptersAndCategories()
      })

      expect(result.current.chaptersLoading).toBe(true)
      expect(result.current.categoriesLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.chaptersLoading).toBe(false)
        expect(result.current.categoriesLoading).toBe(false)
      })
    })

    it('should handle fetch errors', async () => {
      mockFetch.mockImplementation(() => Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' })
      }))

      const { result } = renderHook(() => useData(), { wrapper })

      await act(async () => {
        await result.current.fetchChaptersAndCategories()
      })

      expect(result.current.chaptersError).toBe('Failed to fetch data')
      expect(result.current.categoriesError).toBe('Failed to fetch data')
      expect(result.current.chaptersLoading).toBe(false)
      expect(result.current.categoriesLoading).toBe(false)
    })

    it('should use cache when data is still valid', async () => {
      const { result } = renderHook(() => useData(), { wrapper })

      // First fetch
      await act(async () => {
        await result.current.fetchChaptersAndCategories()
      })

      expect(mockFetch).toHaveBeenCalledTimes(2)

      // Second fetch should use cache
      await act(async () => {
        await result.current.fetchChaptersAndCategories()
      })

      expect(mockFetch).toHaveBeenCalledTimes(2) // Should not increase
    })

    it('should refetch when cache expires', async () => {
      const { result } = renderHook(() => useData(), { wrapper })

      // First fetch
      await act(async () => {
        await result.current.fetchChaptersAndCategories()
      })

      expect(mockFetch).toHaveBeenCalledTimes(2)

      // Advance time by 6 minutes (cache expires after 5 minutes)
      act(() => {
        jest.advanceTimersByTime(6 * 60 * 1000)
      })

      // Second fetch should make new requests
      await act(async () => {
        await result.current.fetchChaptersAndCategories()
      })

      expect(mockFetch).toHaveBeenCalledTimes(4)
    })
  })

  describe('fetchChapter', () => {
    it('should fetch individual chapter', async () => {
      const { result } = renderHook(() => useData(), { wrapper })

      const chapter = await act(async () => {
        return await result.current.fetchChapter('ch1')
      })

      expect(chapter).toEqual(mockChapters[0])
      expect(result.current.getChapter('ch1')).toEqual(mockChapters[0])
    })

    it('should use cached chapter data', async () => {
      const { result } = renderHook(() => useData(), { wrapper })

      // First load chapters
      await act(async () => {
        await result.current.fetchChaptersAndCategories()
      })

      mockFetch.mockClear()

      // Fetch individual chapter should use cached data
      const chapter = await act(async () => {
        return await result.current.fetchChapter('ch1')
      })

      expect(mockFetch).not.toHaveBeenCalled()
      expect(chapter).toEqual(mockChapters[0])
    })

    it('should handle chapter not found', async () => {
      mockFetch.mockImplementation(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ chapters: [] })
      }))

      const { result } = renderHook(() => useData(), { wrapper })

      const chapter = await act(async () => {
        return await result.current.fetchChapter('nonexistent')
      })

      expect(chapter).toBeNull()
      expect(result.current.getChapterError('nonexistent')).toBe('Chapter not found')
    })
  })

  describe('CRUD Operations', () => {
    it('should add new chapter', async () => {
      const { result } = renderHook(() => useData(), { wrapper })

      const newChapter = { ...mockChapters[0], id: 'ch3', title: 'New Chapter' }

      act(() => {
        result.current.addChapter(newChapter)
      })

      expect(result.current.chapters).toContain(newChapter)
      expect(result.current.getChapter('ch3')).toEqual(newChapter)
    })

    it('should update existing chapter', async () => {
      const { result } = renderHook(() => useData(), { wrapper })

      // First add chapters
      await act(async () => {
        await result.current.fetchChaptersAndCategories()
      })

      const updatedChapter = { ...mockChapters[0], title: 'Updated Title' }

      act(() => {
        result.current.updateChapter(updatedChapter)
      })

      expect(result.current.getChapter('ch1')?.title).toBe('Updated Title')
    })

    it('should delete chapter', async () => {
      const { result } = renderHook(() => useData(), { wrapper })

      // First add chapters
      await act(async () => {
        await result.current.fetchChaptersAndCategories()
      })

      act(() => {
        result.current.deleteChapter('ch1')
      })

      expect(result.current.getChapter('ch1')).toBeNull()
      expect(result.current.chapters.find(ch => ch.id === 'ch1')).toBeUndefined()
    })
  })

  describe('Cache Management', () => {
    it('should invalidate specific cache entry', async () => {
      const { result } = renderHook(() => useData(), { wrapper })

      await act(async () => {
        await result.current.fetchChaptersAndCategories()
      })

      mockFetch.mockClear()

      act(() => {
        result.current.invalidateCache('chapters')
      })

      // Next fetch should make new request
      await act(async () => {
        await result.current.fetchChaptersAndCategories()
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/chapters')
    })

    it('should invalidate all cache entries', async () => {
      const { result } = renderHook(() => useData(), { wrapper })

      await act(async () => {
        await result.current.fetchChaptersAndCategories()
      })

      mockFetch.mockClear()

      act(() => {
        result.current.invalidateCache()
      })

      // Next fetch should make new requests
      await act(async () => {
        await result.current.fetchChaptersAndCategories()
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/chapters')
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/chapters?categories=true')
    })
  })

  describe('Loading and Error States', () => {
    it('should track individual chapter loading state', async () => {
      const { result } = renderHook(() => useData(), { wrapper })

      act(() => {
        result.current.fetchChapter('ch1')
      })

      expect(result.current.getChapterLoading('ch1')).toBe(true)

      await waitFor(() => {
        expect(result.current.getChapterLoading('ch1')).toBe(false)
      })
    })

    it('should track individual chapter error state', async () => {
      mockFetch.mockImplementation(() => Promise.reject(new Error('Network error')))

      const { result } = renderHook(() => useData(), { wrapper })

      await act(async () => {
        await result.current.fetchChapter('ch1')
      })

      expect(result.current.getChapterError('ch1')).toBe('Network error')
    })

    it('should clear errors when loading starts', async () => {
      const { result } = renderHook(() => useData(), { wrapper })

      // Set initial error state
      mockFetch.mockImplementationOnce(() => Promise.reject(new Error('First error')))

      await act(async () => {
        await result.current.fetchChaptersAndCategories()
      })

      expect(result.current.chaptersError).toBe('First error')

      // Fix the mock and try again
      mockFetch.mockImplementation(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ chapters: mockChapters })
      }))

      await act(async () => {
        result.current.invalidateCache()
        await result.current.fetchChaptersAndCategories()
      })

      expect(result.current.chaptersError).toBeNull()
    })
  })

  describe('Getters', () => {
    it('should return chapter from cache or main array', async () => {
      const { result } = renderHook(() => useData(), { wrapper })

      await act(async () => {
        await result.current.fetchChaptersAndCategories()
      })

      expect(result.current.getChapter('ch1')).toEqual(mockChapters[0])
      expect(result.current.getChapter('nonexistent')).toBeNull()
    })

    it('should return loading state for non-existent chapter', () => {
      const { result } = renderHook(() => useData(), { wrapper })

      expect(result.current.getChapterLoading('nonexistent')).toBe(false)
    })

    it('should return error state for non-existent chapter', () => {
      const { result } = renderHook(() => useData(), { wrapper })

      expect(result.current.getChapterError('nonexistent')).toBeNull()
    })
  })
})