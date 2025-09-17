'use client'

import { createContext, useContext, useReducer, useCallback, ReactNode, useRef } from 'react'
import { Category, Chapter } from '@/types'

type CacheEntry<T> = {
  data: T
  timestamp: number
  loading: boolean
  error: string | null
}

type DataState = {
  chapters: CacheEntry<Chapter[]>
  categories: CacheEntry<Category[]>
  individualChapters: Record<string, CacheEntry<Chapter>>
}

type DataAction = 
  | { type: 'SET_LOADING'; payload: { key: keyof DataState | string; loading: boolean } }
  | { type: 'SET_ERROR'; payload: { key: keyof DataState | string; error: string | null } }
  | { type: 'SET_CHAPTERS'; payload: Chapter[] }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'SET_INDIVIDUAL_CHAPTER'; payload: { id: string; chapter: Chapter } }
  | { type: 'UPDATE_CHAPTER'; payload: Chapter }
  | { type: 'DELETE_CHAPTER'; payload: string }
  | { type: 'ADD_CHAPTER'; payload: Chapter }
  | { type: 'INVALIDATE_CACHE'; payload?: string }

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const API_BASE = '/api/chapters'

const initialState: DataState = {
  chapters: { data: [], timestamp: 0, loading: false, error: null },
  categories: { data: [], timestamp: 0, loading: false, error: null },
  individualChapters: {}
}

function createCacheEntry<T>(data: T, loading = false, error: string | null = null): CacheEntry<T> {
  return {
    data,
    timestamp: Date.now(),
    loading,
    error
  }
}

function isCacheValid(entry: CacheEntry<any>): boolean {
  return Date.now() - entry.timestamp < CACHE_DURATION && !entry.loading && !entry.error
}

function dataReducer(state: DataState, action: DataAction): DataState {
  switch (action.type) {
    case 'SET_LOADING': {
      const { key, loading } = action.payload
      if (key === 'chapters' || key === 'categories') {
        return {
          ...state,
          [key]: { ...state[key], loading, error: loading ? null : state[key].error }
        }
      } else {
        // Individual chapter
        const chapterId = key as string
        return {
          ...state,
          individualChapters: {
            ...state.individualChapters,
            [chapterId]: {
              ...state.individualChapters[chapterId],
              loading,
              error: loading ? null : state.individualChapters[chapterId]?.error || null
            }
          }
        }
      }
    }

    case 'SET_ERROR': {
      const { key, error } = action.payload
      if (key === 'chapters' || key === 'categories') {
        return {
          ...state,
          [key]: { ...state[key], loading: false, error }
        }
      } else {
        // Individual chapter
        const chapterId = key as string
        return {
          ...state,
          individualChapters: {
            ...state.individualChapters,
            [chapterId]: {
              ...state.individualChapters[chapterId],
              loading: false,
              error
            }
          }
        }
      }
    }

    case 'SET_CHAPTERS':
      return {
        ...state,
        chapters: createCacheEntry(action.payload)
      }

    case 'SET_CATEGORIES':
      return {
        ...state,
        categories: createCacheEntry(action.payload)
      }

    case 'SET_INDIVIDUAL_CHAPTER':
      return {
        ...state,
        individualChapters: {
          ...state.individualChapters,
          [action.payload.id]: createCacheEntry(action.payload.chapter)
        }
      }

    case 'UPDATE_CHAPTER': {
      const updatedChapter = action.payload
      return {
        ...state,
        chapters: {
          ...state.chapters,
          data: state.chapters.data.map(ch => ch.id === updatedChapter.id ? updatedChapter : ch),
          timestamp: Date.now()
        },
        individualChapters: {
          ...state.individualChapters,
          [updatedChapter.id]: createCacheEntry(updatedChapter)
        }
      }
    }

    case 'DELETE_CHAPTER': {
      const chapterId = action.payload
      const { [chapterId]: deleted, ...remainingChapters } = state.individualChapters
      return {
        ...state,
        chapters: {
          ...state.chapters,
          data: state.chapters.data.filter(ch => ch.id !== chapterId),
          timestamp: Date.now()
        },
        individualChapters: remainingChapters
      }
    }

    case 'ADD_CHAPTER': {
      const newChapter = action.payload
      return {
        ...state,
        chapters: {
          ...state.chapters,
          data: [...state.chapters.data, newChapter],
          timestamp: Date.now()
        },
        individualChapters: {
          ...state.individualChapters,
          [newChapter.id]: createCacheEntry(newChapter)
        }
      }
    }

    case 'INVALIDATE_CACHE': {
      const key = action.payload
      if (key) {
        if (key === 'chapters' || key === 'categories') {
          return {
            ...state,
            [key]: { ...state[key], timestamp: 0 }
          }
        } else {
          // Individual chapter
          return {
            ...state,
            individualChapters: {
              ...state.individualChapters,
              [key]: { ...state.individualChapters[key], timestamp: 0 }
            }
          }
        }
      } else {
        // Invalidate all
        return {
          chapters: { ...state.chapters, timestamp: 0 },
          categories: { ...state.categories, timestamp: 0 },
          individualChapters: Object.keys(state.individualChapters).reduce((acc, id) => {
            acc[id] = { ...state.individualChapters[id], timestamp: 0 }
            return acc
          }, {} as Record<string, CacheEntry<Chapter>>)
        }
      }
    }

    default:
      return state
  }
}

type DataContextType = {
  // State
  chapters: Chapter[]
  categories: Category[]
  chaptersLoading: boolean
  categoriesLoading: boolean
  chaptersError: string | null
  categoriesError: string | null

  // Chapter-specific getters
  getChapter: (id: string) => Chapter | null
  getChapterLoading: (id: string) => boolean
  getChapterError: (id: string) => string | null

  // Actions
  fetchChaptersAndCategories: () => Promise<void>
  fetchChapter: (id: string) => Promise<Chapter | null>
  updateChapter: (chapter: Chapter) => void
  deleteChapter: (id: string) => void
  addChapter: (chapter: Chapter) => void
  invalidateCache: (key?: string) => void
}

const DataContext = createContext<DataContextType | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dataReducer, initialState)

  // Use ref to track if fetch is in progress to prevent duplicate requests
  const fetchingRef = useRef(false)

  const fetchChaptersAndCategories = useCallback(async () => {
    // Check if we have valid cached data
    if (isCacheValid(state.chapters) && isCacheValid(state.categories)) {
      return
    }

    // Prevent duplicate fetches
    if (fetchingRef.current) {
      return
    }

    fetchingRef.current = true

    try {
      dispatch({ type: 'SET_LOADING', payload: { key: 'chapters', loading: true } })
      dispatch({ type: 'SET_LOADING', payload: { key: 'categories', loading: true } })

      const [chaptersRes, categoriesRes] = await Promise.all([
        fetch(API_BASE),
        fetch(`${API_BASE}?categories=true`)
      ])

      if (!chaptersRes.ok || !categoriesRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const chaptersData = await chaptersRes.json()
      const categoriesData = await categoriesRes.json()

      dispatch({ type: 'SET_CHAPTERS', payload: chaptersData.chapters || [] })
      dispatch({ type: 'SET_CATEGORIES', payload: categoriesData.categories || [] })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data'
      dispatch({ type: 'SET_ERROR', payload: { key: 'chapters', error: errorMessage } })
      dispatch({ type: 'SET_ERROR', payload: { key: 'categories', error: errorMessage } })
    } finally {
      fetchingRef.current = false
    }
  }, [state.chapters, state.categories])

  const fetchingChaptersRef = useRef(new Set<string>())

  const fetchChapter = useCallback(async (id: string): Promise<Chapter | null> => {
    // Check individual chapter cache first
    const cachedChapter = state.individualChapters[id]
    if (cachedChapter && isCacheValid(cachedChapter)) {
      return cachedChapter.data
    }

    // Check if chapter exists in the main chapters array
    const existingChapter = state.chapters.data.find(ch => ch.id === id)
    if (existingChapter && isCacheValid(state.chapters)) {
      dispatch({ type: 'SET_INDIVIDUAL_CHAPTER', payload: { id, chapter: existingChapter } })
      return existingChapter
    }

    // Prevent duplicate fetches for the same chapter
    if (fetchingChaptersRef.current.has(id)) {
      // Wait a bit and check cache again
      await new Promise(resolve => setTimeout(resolve, 100))
      const cached = state.individualChapters[id]
      return cached?.data || null
    }

    fetchingChaptersRef.current.add(id)

    try {
      dispatch({ type: 'SET_LOADING', payload: { key: id, loading: true } })

      const response = await fetch(API_BASE)
      if (!response.ok) throw new Error('Failed to fetch chapter')

      const data = await response.json()
      const chapter = data.chapters?.find((ch: Chapter) => ch.id === id)

      if (!chapter) {
        throw new Error('Chapter not found')
      }

      dispatch({ type: 'SET_INDIVIDUAL_CHAPTER', payload: { id, chapter } })
      return chapter
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch chapter'
      dispatch({ type: 'SET_ERROR', payload: { key: id, error: errorMessage } })
      return null
    } finally {
      fetchingChaptersRef.current.delete(id)
    }
  }, [state.individualChapters, state.chapters])

  const updateChapter = useCallback((chapter: Chapter) => {
    dispatch({ type: 'UPDATE_CHAPTER', payload: chapter })
  }, [])

  const deleteChapter = useCallback((id: string) => {
    dispatch({ type: 'DELETE_CHAPTER', payload: id })
  }, [])

  const addChapter = useCallback((chapter: Chapter) => {
    dispatch({ type: 'ADD_CHAPTER', payload: chapter })
  }, [])

  const invalidateCache = useCallback((key?: string) => {
    dispatch({ type: 'INVALIDATE_CACHE', payload: key })
  }, [])

  const getChapter = useCallback((id: string): Chapter | null => {
    const cachedChapter = state.individualChapters[id]
    if (cachedChapter) return cachedChapter.data

    return state.chapters.data.find(ch => ch.id === id) || null
  }, [state.chapters.data, state.individualChapters])

  const getChapterLoading = useCallback((id: string): boolean => {
    return state.individualChapters[id]?.loading || false
  }, [state.individualChapters])

  const getChapterError = useCallback((id: string): string | null => {
    return state.individualChapters[id]?.error || null
  }, [state.individualChapters])

  const contextValue: DataContextType = {
    // State
    chapters: state.chapters.data,
    categories: state.categories.data,
    chaptersLoading: state.chapters.loading,
    categoriesLoading: state.categories.loading,
    chaptersError: state.chapters.error,
    categoriesError: state.categories.error,

    // Chapter-specific getters
    getChapter,
    getChapterLoading,
    getChapterError,

    // Actions
    fetchChaptersAndCategories,
    fetchChapter,
    updateChapter,
    deleteChapter,
    addChapter,
    invalidateCache
  }

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}