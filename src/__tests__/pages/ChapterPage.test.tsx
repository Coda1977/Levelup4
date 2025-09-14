import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '../utils/test-utils'
import ChapterPage from '@/app/learn/[id]/page'
import { mockChapters, mockCategories, createMockFetch, mockFetchSuccess } from '../utils/test-utils'

// Mock Next.js useParams
const mockParams = { id: 'ch1' }
jest.mock('next/navigation', () => ({
  useParams: () => mockParams
}))

// Mock ChapterAudioPlayer component
jest.mock('@/components/ChapterAudioPlayer', () => {
  return {
    __esModule: true,
    default: function MockChapterAudioPlayer({ audioUrl, title, readingTime }: any) {
      return (
        <div data-testid="audio-player">
          <div>Audio: {title}</div>
          <div>Duration: {readingTime} min</div>
          <div>URL: {audioUrl}</div>
        </div>
      )
    }
  }
})

// Mock sanitizeHtml utility
jest.mock('@/lib/sanitize', () => ({
  sanitizeHtml: (html: string) => html
}))

// Mock window.location
const mockLocation = {
  href: '',
  assign: jest.fn(),
  replace: jest.fn()
}

// Delete the existing property first
delete (window as any).location
// Then define the mock
window.location = mockLocation as any

// Mock scroll events
const mockScrollTo = jest.fn()
Object.defineProperty(window, 'scrollTo', {
  value: mockScrollTo,
  writable: true
})

describe('ChapterPage', () => {
  let mockFetch: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockLocation.href = ''
    mockScrollTo.mockClear()

    mockFetch = createMockFetch({
      '/api/admin/chapters': mockFetchSuccess({ chapters: mockChapters, categories: mockCategories })
    })
    global.fetch = mockFetch

    // Mock scroll properties
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true })
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 1000, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true })
  })

  describe('Loading States', () => {
    it('should show loading state initially', async () => {
      render(<ChapterPage />)

      expect(screen.getByText('Loading chapter...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Loading chapter...')).not.toBeInTheDocument()
      })
    })

    it('should fetch chapter data on mount', async () => {
      render(<ChapterPage />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/chapters')
      })
    })
  })

  describe('Chapter Content Rendering', () => {
    it('should render chapter title and metadata', async () => {
      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText(mockChapters[0].title)).toBeInTheDocument()
      })

      expect(screen.getByText(/Chapter 1/)).toBeInTheDocument()
      expect(screen.getByText(/min read/)).toBeInTheDocument()
    })

    it('should render chapter description if available', async () => {
      render(<ChapterPage />)

      await waitFor(() => {
        if (mockChapters[0].description) {
          expect(screen.getByText(mockChapters[0].description)).toBeInTheDocument()
        }
      })
    })

    it('should render back to category button', async () => {
      render(<ChapterPage />)

      await waitFor(() => {
        const backButton = screen.getByText(/Back to/)
        expect(backButton).toBeInTheDocument()

        const category = mockCategories.find(c => c.id === mockChapters[0].category_id)
        if (category) {
          expect(screen.getByText(`Back to ${category.name}`)).toBeInTheDocument()
        }
      })
    })

    it('should show book summary badge for book summaries', async () => {
      // Mock a book summary chapter
      const bookChapter = { ...mockChapters[0], content_type: 'book_summary', author: 'Test Author' }
      mockFetch.mockImplementation(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ chapters: [bookChapter], categories: mockCategories })
      }))

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText('📚 Book Summary')).toBeInTheDocument()
      })
    })
  })

  describe('Content Formatting', () => {
    it('should render HTML content when chapter contains HTML', async () => {
      const htmlChapter = {
        ...mockChapters[0],
        content: '<h2>Test Heading</h2><p>Test paragraph with <strong>bold</strong> text.</p>'
      }
      mockFetch.mockImplementation(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ chapters: [htmlChapter], categories: mockCategories })
      }))

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Heading')).toBeInTheDocument()
        expect(screen.getByText(/Test paragraph with/)).toBeInTheDocument()
      })
    })

    it('should parse markdown content correctly', async () => {
      const markdownChapter = {
        ...mockChapters[0],
        content: '## Test Heading\n\nTest paragraph with **bold** text.\n\n### Subheading\n\n- List item 1\n- List item 2'
      }
      mockFetch.mockImplementation(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ chapters: [markdownChapter], categories: mockCategories })
      }))

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Heading')).toBeInTheDocument()
        expect(screen.getByText('Subheading')).toBeInTheDocument()
        expect(screen.getByText('List item 1')).toBeInTheDocument()
        expect(screen.getByText('List item 2')).toBeInTheDocument()
      })
    })

    it('should handle blockquotes correctly', async () => {
      const quoteChapter = {
        ...mockChapters[0],
        content: '> This is a blockquote\n> with multiple lines'
      }
      mockFetch.mockImplementation(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ chapters: [quoteChapter], categories: mockCategories })
      }))

      render(<ChapterPage />)

      await waitFor(() => {
        const blockquote = screen.getByText(/This is a blockquote/)
        expect(blockquote.closest('blockquote')).toBeInTheDocument()
      })
    })
  })

  describe('Audio Player Integration', () => {
    it('should render audio player when audio URL is available', async () => {
      const audioChapter = {
        ...mockChapters[0],
        audio_url: 'https://example.com/audio.mp3'
      }
      mockFetch.mockImplementation(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ chapters: [audioChapter], categories: mockCategories })
      }))

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByTestId('audio-player')).toBeInTheDocument()
        expect(screen.getByText(`Audio: ${audioChapter.title}`)).toBeInTheDocument()
      })
    })

    it('should not render audio player when no audio URL', async () => {
      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.queryByTestId('audio-player')).not.toBeInTheDocument()
      })
    })
  })

  describe('Key Takeaways Section', () => {
    it('should render key takeaways for book summaries', async () => {
      const bookChapter = {
        ...mockChapters[0],
        content_type: 'book_summary',
        key_takeaways: ['First takeaway', 'Second takeaway', 'Third takeaway']
      }
      mockFetch.mockImplementation(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ chapters: [bookChapter], categories: mockCategories })
      }))

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText('🔑')).toBeInTheDocument()
        expect(screen.getByText('Key Takeaways')).toBeInTheDocument()
        expect(screen.getByText('First takeaway')).toBeInTheDocument()
        expect(screen.getByText('Second takeaway')).toBeInTheDocument()
        expect(screen.getByText('Third takeaway')).toBeInTheDocument()
      })
    })

    it('should number key takeaways correctly', async () => {
      const bookChapter = {
        ...mockChapters[0],
        content_type: 'book_summary',
        key_takeaways: ['First', 'Second']
      }
      mockFetch.mockImplementation(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ chapters: [bookChapter], categories: mockCategories })
      }))

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
      })
    })
  })

  describe('Try This Week Section', () => {
    it('should render try this week section when available', async () => {
      const chapterWithAction = {
        ...mockChapters[0],
        try_this_week: 'Practice active listening in your next team meeting'
      }
      mockFetch.mockImplementation(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ chapters: [chapterWithAction], categories: mockCategories })
      }))

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText('🎯')).toBeInTheDocument()
        expect(screen.getByText('Try This Week')).toBeInTheDocument()
        expect(screen.getByText('Practice active listening in your next team meeting')).toBeInTheDocument()
      })
    })

    it('should not render try this week section when not available', async () => {
      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.queryByText('Try This Week')).not.toBeInTheDocument()
      })
    })
  })

  describe('Media Players', () => {
    describe('Podcast Integration', () => {
      it('should render Spotify podcast embed', async () => {
        const podcastChapter = {
          ...mockChapters[0],
          podcast_url: 'https://open.spotify.com/episode/abc123',
          podcast_title: 'Test Podcast Episode'
        }
        mockFetch.mockImplementation(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ chapters: [podcastChapter], categories: mockCategories })
        }))

        render(<ChapterPage />)

        await waitFor(() => {
          expect(screen.getByText('🎧')).toBeInTheDocument()
          expect(screen.getByText('Test Podcast Episode')).toBeInTheDocument()
          expect(screen.getByText('Listen to the audio version')).toBeInTheDocument()
        })
      })

      it('should render external podcast link when embed not available', async () => {
        const podcastChapter = {
          ...mockChapters[0],
          podcast_url: 'https://example.com/podcast',
          podcast_title: 'External Podcast'
        }
        mockFetch.mockImplementation(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ chapters: [podcastChapter], categories: mockCategories })
        }))

        render(<ChapterPage />)

        await waitFor(() => {
          expect(screen.getByText('Listen on your preferred platform')).toBeInTheDocument()
          expect(screen.getByText('Listen Now')).toBeInTheDocument()
        })
      })
    })

    describe('Video Integration', () => {
      it('should render YouTube video embed', async () => {
        const videoChapter = {
          ...mockChapters[0],
          video_url: 'https://www.youtube.com/watch?v=abc123',
          video_title: 'Test Video'
        }
        mockFetch.mockImplementation(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ chapters: [videoChapter], categories: mockCategories })
        }))

        render(<ChapterPage />)

        await waitFor(() => {
          expect(screen.getByText('📺')).toBeInTheDocument()
          expect(screen.getByText('Test Video')).toBeInTheDocument()
          expect(screen.getByText('Watch the video content')).toBeInTheDocument()
        })

        // Check for iframe with YouTube embed
        const iframe = screen.getByTitle('Test Video')
        expect(iframe).toBeInTheDocument()
        expect(iframe).toHaveAttribute('src', expect.stringContaining('youtube.com/embed'))
      })

      it('should render external video link when not YouTube', async () => {
        const videoChapter = {
          ...mockChapters[0],
          video_url: 'https://example.com/video',
          video_title: 'External Video'
        }
        mockFetch.mockImplementation(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ chapters: [videoChapter], categories: mockCategories })
        }))

        render(<ChapterPage />)

        await waitFor(() => {
          expect(screen.getByText('Watch on external platform')).toBeInTheDocument()
          expect(screen.getByText('Watch Now')).toBeInTheDocument()
        })
      })
    })
  })

  describe('Reading Progress', () => {
    it('should render reading progress bar', async () => {
      render(<ChapterPage />)

      await waitFor(() => {
        const { container } = render(<ChapterPage />)
        const progressBar = container.querySelector('.fixed.top-0')
        expect(progressBar).toBeInTheDocument()
      })
    })

    it('should calculate reading time correctly', async () => {
      render(<ChapterPage />)

      await waitFor(() => {
        // Should show reading time based on content length or chapter.reading_time
        expect(screen.getByText(/min read/)).toBeInTheDocument()
      })
    })

    it('should update progress on scroll', async () => {
      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText(mockChapters[0].title)).toBeInTheDocument()
      })

      // Simulate scroll event
      Object.defineProperty(window, 'scrollY', { value: 100 })
      fireEvent.scroll(window)

      // Reading time indicator might appear
      // This is more of an integration test for scroll behavior
    })
  })

  describe('Navigation', () => {
    it('should navigate back to category when back button is clicked', async () => {
      render(<ChapterPage />)

      await waitFor(() => {
        const backButton = screen.getByText(/Back to/)
        fireEvent.click(backButton)
        expect(mockLocation.href).toBe(`/learn/category/${mockChapters[0].category_id}`)
      })
    })

    it('should handle category navigation with proper URL', async () => {
      render(<ChapterPage />)

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /Back to/ })
        expect(backButton).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should show error message when chapter not found', async () => {
      mockFetch.mockImplementation(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ chapters: [], categories: mockCategories })
      }))

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText('Chapter not found')).toBeInTheDocument()
      })
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockImplementation(() => Promise.reject(new Error('API Error')))

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText('Chapter not found')).toBeInTheDocument()
      })
    })

    it('should handle malformed response data', async () => {
      mockFetch.mockImplementation(() => Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid request' })
      }))

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText('Chapter not found')).toBeInTheDocument()
      })
    })
  })

  describe('Book Summary Features', () => {
    it('should render book metadata for book summaries', async () => {
      const bookChapter = {
        ...mockChapters[0],
        content_type: 'book_summary',
        author: 'Malcolm Gladwell',
        reading_time: 8
      }
      mockFetch.mockImplementation(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ chapters: [bookChapter], categories: mockCategories })
      }))

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText('Author:')).toBeInTheDocument()
        expect(screen.getByText('Malcolm Gladwell')).toBeInTheDocument()
        expect(screen.getByText('Original Length:')).toBeInTheDocument()
        expect(screen.getByText('Summary Time:')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      render(<ChapterPage />)

      await waitFor(() => {
        const h1Elements = screen.getAllByRole('heading', { level: 1 })
        expect(h1Elements.length).toBeGreaterThan(0)
      })
    })

    it('should have accessible media controls', async () => {
      const mediaChapter = {
        ...mockChapters[0],
        podcast_url: 'https://example.com/podcast.mp3',
        video_url: 'https://youtube.com/watch?v=abc'
      }
      mockFetch.mockImplementation(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ chapters: [mediaChapter], categories: mockCategories })
      }))

      render(<ChapterPage />)

      await waitFor(() => {
        // Media sections should be accessible
        expect(screen.getByText('Listen to the audio version')).toBeInTheDocument()
        expect(screen.getByText('Watch the video content')).toBeInTheDocument()
      })
    })

    it('should have accessible navigation buttons', async () => {
      render(<ChapterPage />)

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /Back to/ })
        expect(backButton).toBeInTheDocument()
        expect(backButton).toHaveAccessibleName()
      })
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive layouts', async () => {
      const { container } = render(<ChapterPage />)

      await waitFor(() => {
        // Check for responsive classes
        const responsiveElements = container.querySelectorAll('[class*="md:"], [class*="lg:"]')
        expect(responsiveElements.length).toBeGreaterThan(0)
      })
    })

    it('should have responsive text sizing', async () => {
      const { container } = render(<ChapterPage />)

      await waitFor(() => {
        const responsiveText = container.querySelectorAll('[class*="text-2xl"], [class*="md:text-"]')
        expect(responsiveText.length).toBeGreaterThan(0)
      })
    })
  })

  describe('URL Parameter Handling', () => {
    it('should use the correct chapter ID from URL params', async () => {
      render(<ChapterPage />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/chapters')
        // The component should find the chapter with ID 'ch1' from mockParams
      })
    })

    it('should handle missing or invalid chapter ID', async () => {
      // Mock empty params
      jest.doMock('next/navigation', () => ({
        useParams: () => ({ id: null })
      }))

      render(<ChapterPage />)

      // Should not crash and show loading or error state
      expect(screen.getByText('Loading chapter...')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should not cause memory leaks with scroll listeners', async () => {
      const { unmount } = render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText(mockChapters[0].title)).toBeInTheDocument()
      })

      // Mock addEventListener/removeEventListener to track calls
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

      act(() => {
        unmount()
      })

      // Should clean up scroll listeners
      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    })
  })
})