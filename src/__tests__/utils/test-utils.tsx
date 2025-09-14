import React from 'react'
import { render as rtlRender, RenderOptions } from '@testing-library/react'
import { DataProvider } from '@/contexts/DataContext'
import type { Chapter, Category } from '@/contexts/DataContext'

// Mock data
export const mockCategories: Category[] = [
  {
    id: 'cat1',
    name: 'Leadership',
    description: 'Leadership skills and principles',
    sort_order: 1
  },
  {
    id: 'cat2',
    name: 'Communication',
    description: 'Communication and interpersonal skills',
    sort_order: 2
  }
]

export const mockChapters: Chapter[] = [
  {
    id: 'ch1',
    category_id: 'cat1',
    title: 'Test Chapter 1',
    content: '# Test Content 1\n\nThis is test content.',
    preview: 'Test preview 1',
    sort_order: 1,
    content_type: 'markdown',
    chapter_number: 1,
    reading_time: 5,
    podcast_title: null,
    podcast_url: null,
    video_title: null,
    video_url: null,
    try_this_week: 'Try this test action',
    author: 'Test Author',
    description: 'Test description',
    key_takeaways: ['Key point 1', 'Key point 2'],
    podcast_header: null,
    video_header: null,
    audio_url: null,
    audio_voice: null,
    audio_generated_at: null
  },
  {
    id: 'ch2',
    category_id: 'cat2',
    title: 'Test Chapter 2',
    content: '# Test Content 2\n\nThis is more test content.',
    preview: 'Test preview 2',
    sort_order: 2,
    content_type: 'markdown',
    chapter_number: 2,
    reading_time: 8,
    podcast_title: 'Test Podcast',
    podcast_url: 'https://test-podcast.com',
    video_title: 'Test Video',
    video_url: 'https://test-video.com',
    try_this_week: null,
    author: 'Test Author 2',
    description: 'Test description 2',
    key_takeaways: ['Key point 3', 'Key point 4'],
    podcast_header: 'Listen to this podcast',
    video_header: 'Watch this video',
    audio_url: 'https://test-audio.com',
    audio_voice: 'alloy',
    audio_generated_at: '2024-01-01T00:00:00Z'
  }
]

// Custom render function that includes providers
function customRender(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <DataProvider>
        {children}
      </DataProvider>
    )
  }

  return rtlRender(ui, { wrapper: Wrapper, ...options })
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Helper functions
export const createMockFetch = (responses: Record<string, any>) => {
  return jest.fn().mockImplementation((url: string, options?: RequestInit) => {
    const response = responses[url] || responses['default']

    if (response instanceof Error) {
      return Promise.reject(response)
    }

    return Promise.resolve({
      ok: response.ok !== false,
      status: response.status || 200,
      json: () => Promise.resolve(response.data || response),
      text: () => Promise.resolve(JSON.stringify(response.data || response))
    })
  })
}

export const mockFetchSuccess = (data: any) => ({
  ok: true,
  status: 200,
  data
})

export const mockFetchError = (message: string, status = 500) => ({
  ok: false,
  status,
  data: { error: message }
})

// Wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock timers helpers
export const advanceTimers = (ms: number) => {
  jest.advanceTimersByTime(ms)
}

export const runAllTimers = () => {
  jest.runAllTimers()
}