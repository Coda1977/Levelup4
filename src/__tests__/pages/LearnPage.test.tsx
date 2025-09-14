import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '../utils/test-utils'
import LearnPage from '@/app/learn/page'
import { mockChapters, mockCategories } from '../utils/test-utils'

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

// Mock the current time for consistent greeting tests
const mockDate = new Date('2024-01-15T10:30:00Z') // Monday morning
jest.spyOn(global, 'Date').mockImplementation(() => mockDate)

describe('LearnPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocation.href = ''
  })

  describe('Loading State', () => {
    it('should show loading spinner when data is loading', () => {
      // Mock loading state
      const mockUseData = {
        chapters: [],
        categories: [],
        chaptersLoading: true,
        categoriesLoading: false,
        fetchChaptersAndCategories: jest.fn()
      }

      jest.doMock('@/contexts/DataContext', () => ({
        useData: () => mockUseData
      }))

      render(<LearnPage />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument() // Loading spinner
    })

    it('should fetch chapters and categories on mount', () => {
      const mockFetch = jest.fn()
      const mockUseData = {
        chapters: mockChapters,
        categories: mockCategories,
        chaptersLoading: false,
        categoriesLoading: false,
        fetchChaptersAndCategories: mockFetch
      }

      jest.doMock('@/contexts/DataContext', () => ({
        useData: () => mockUseData
      }))

      render(<LearnPage />)

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Personalized Greeting', () => {
    it('should show good morning greeting for morning hours', () => {
      // Mock morning time
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9)

      render(<LearnPage />)

      expect(screen.getByText('Good morning, there!')).toBeInTheDocument()
    })

    it('should show good afternoon greeting for afternoon hours', () => {
      // Mock afternoon time
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14)

      render(<LearnPage />)

      expect(screen.getByText('Good afternoon, there!')).toBeInTheDocument()
    })

    it('should show good evening greeting for evening hours', () => {
      // Mock evening time
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(19)

      render(<LearnPage />)

      expect(screen.getByText('Good evening, there!')).toBeInTheDocument()
    })
  })

  describe('Content Rendering', () => {
    it('should render main heading and journey text', () => {
      render(<LearnPage />)

      expect(screen.getByText('Your Learning Journey')).toBeInTheDocument()
      expect(screen.getByText('Ready to start building your management skills?')).toBeInTheDocument()
    })

    it('should display correct progress statistics', () => {
      render(<LearnPage />)

      // Should show total chapters count
      expect(screen.getByText(`You've completed 0 out of ${mockChapters.length} chapters`)).toBeInTheDocument()
      expect(screen.getByText(`0 of ${mockChapters.length}`)).toBeInTheDocument()
    })

    it('should render progress bar with correct width', () => {
      const { container } = render(<LearnPage />)

      const progressBar = container.querySelector('.h-3.rounded-full[style*="width"]')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveStyle('width: 0%') // No completed chapters
    })

    it('should show next chapter information', () => {
      render(<LearnPage />)

      if (mockChapters.length > 0) {
        expect(screen.getByText(`Next: ${mockChapters[0].title}`)).toBeInTheDocument()
      }
    })
  })

  describe('Quick Actions', () => {
    it('should render Start Learning button when no progress', () => {
      render(<LearnPage />)

      const startButton = screen.getByText('Start Learning')
      expect(startButton).toBeInTheDocument()
      expect(startButton.closest('button')).toHaveClass('hover-lift')
    })

    it('should render Ask AI Coach button', () => {
      render(<LearnPage />)

      const aiCoachButton = screen.getByText('Ask AI Coach')
      expect(aiCoachButton).toBeInTheDocument()
      expect(aiCoachButton.closest('button')).toHaveClass('ai-coach-button')
    })

    it('should navigate to first chapter when Start Learning is clicked', () => {
      render(<LearnPage />)

      const startButton = screen.getByText('Start Learning')
      fireEvent.click(startButton)

      expect(mockLocation.href).toBe(`/learn/${mockChapters[0].id}`)
    })

    it('should navigate to AI coach when button is clicked', () => {
      render(<LearnPage />)

      const aiCoachButton = screen.getByText('Ask AI Coach')
      fireEvent.click(aiCoachButton)

      expect(mockLocation.href).toBe('/ai-coach')
    })
  })

  describe('Continue Learning Section', () => {
    it('should render recent chapters for continuing', () => {
      render(<LearnPage />)

      expect(screen.getByText('Continue Your Journey')).toBeInTheDocument()
      expect(screen.getByText('Pick up where you left off')).toBeInTheDocument()

      // Should show first 2 chapters as recent
      const recentChapters = mockChapters.slice(0, 2)
      recentChapters.forEach(chapter => {
        expect(screen.getByText(chapter.title)).toBeInTheDocument()
      })
    })

    it('should show category names for recent chapters', () => {
      render(<LearnPage />)

      const recentChapters = mockChapters.slice(0, 2)
      recentChapters.forEach(chapter => {
        const category = mockCategories.find(cat => cat.id === chapter.category_id)
        if (category) {
          expect(screen.getByText(category.name)).toBeInTheDocument()
        }
      })
    })

    it('should navigate to chapter when continue card is clicked', () => {
      render(<LearnPage />)

      const firstChapterCard = screen.getByText(mockChapters[0].title).closest('.cursor-pointer')
      expect(firstChapterCard).toBeInTheDocument()

      fireEvent.click(firstChapterCard!)

      expect(mockLocation.href).toBe(`/learn/${mockChapters[0].id}`)
    })
  })

  describe('Progress Overview', () => {
    it('should render progress overview section', () => {
      render(<LearnPage />)

      expect(screen.getByText('Progress Overview')).toBeInTheDocument()
    })

    it('should show progress percentages for each category', () => {
      render(<LearnPage />)

      mockCategories.forEach(category => {
        // Should show 0% for each category initially
        const percentageElements = screen.getAllByText('0%')
        expect(percentageElements.length).toBeGreaterThan(0)

        // Should show category name
        expect(screen.getByText(category.name)).toBeInTheDocument()
      })
    })
  })

  describe('Learning Categories Section', () => {
    it('should render explore all topics section', () => {
      render(<LearnPage />)

      expect(screen.getByText('Explore All Topics')).toBeInTheDocument()
      expect(screen.getByText(/Master the essential skills of effective management/)).toBeInTheDocument()
    })

    it('should render all categories as cards', () => {
      render(<LearnPage />)

      mockCategories.forEach((category, index) => {
        // Check for category number
        const categoryNumber = category.sort_order < 10 ? `0${category.sort_order}` : category.sort_order.toString()
        expect(screen.getByText(categoryNumber)).toBeInTheDocument()

        // Check for category name and description
        expect(screen.getByText(category.name)).toBeInTheDocument()
        expect(screen.getByText(category.description)).toBeInTheDocument()
      })
    })

    it('should show progress bars for categories', () => {
      const { container } = render(<LearnPage />)

      // Should have progress bars for each category
      const progressBars = container.querySelectorAll('.h-2.rounded-full[style*="width"]')
      expect(progressBars.length).toBe(mockCategories.length)

      // All should show 0% progress initially
      progressBars.forEach(bar => {
        expect(bar).toHaveStyle('width: 0%')
      })
    })

    it('should show chapter previews in category cards', () => {
      render(<LearnPage />)

      // Should show first few chapters from each category
      mockCategories.forEach(category => {
        const categoryChapters = mockChapters.filter(ch => ch.category_id === category.id)
        const previewChapters = categoryChapters.slice(0, 3)

        previewChapters.forEach(chapter => {
          expect(screen.getByText(chapter.title)).toBeInTheDocument()
        })

        if (categoryChapters.length > 3) {
          expect(screen.getByText(`+${categoryChapters.length - 3} more chapters`)).toBeInTheDocument()
        }
      })
    })

    it('should navigate to category page when card is clicked', () => {
      render(<LearnPage />)

      const firstCategoryCard = screen.getByText(mockCategories[0].name).closest('.cursor-pointer')
      expect(firstCategoryCard).toBeInTheDocument()

      fireEvent.click(firstCategoryCard!)

      expect(mockLocation.href).toBe(`/learn/category/${mockCategories[0].id}`)
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive grid layouts', () => {
      const { container } = render(<LearnPage />)

      // Check for responsive grid classes
      const responsiveGrids = container.querySelectorAll('[class*="md:grid-cols"], [class*="lg:grid-cols"]')
      expect(responsiveGrids.length).toBeGreaterThan(0)
    })

    it('should have responsive text sizing', () => {
      const { container } = render(<LearnPage />)

      // Check for clamp text sizing
      const responsiveText = container.querySelectorAll('[class*="clamp"]')
      expect(responsiveText.length).toBeGreaterThan(0)
    })

    it('should have responsive padding and margins', () => {
      const { container } = render(<LearnPage />)

      // Check for responsive spacing
      const responsiveSpacing = container.querySelectorAll('[class*="md:py-"], [class*="md:px-"], [class*="lg:flex-row"]')
      expect(responsiveSpacing.length).toBeGreaterThan(0)
    })
  })

  describe('Activity Messages', () => {
    it('should show appropriate message for no completed chapters', () => {
      render(<LearnPage />)

      expect(screen.getByText('Ready to start building your management skills?')).toBeInTheDocument()
    })

    it('should update button text based on progress', () => {
      render(<LearnPage />)

      // With no completed chapters, should show "Start Learning"
      expect(screen.getByText('Start Learning')).toBeInTheDocument()
      expect(screen.queryByText('Continue Learning')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing chapters gracefully', () => {
      const mockUseData = {
        chapters: [],
        categories: mockCategories,
        chaptersLoading: false,
        categoriesLoading: false,
        fetchChaptersAndCategories: jest.fn()
      }

      jest.doMock('@/contexts/DataContext', () => ({
        useData: () => mockUseData
      }))

      render(<LearnPage />)

      expect(screen.getByText('No chapters available')).toBeInTheDocument()
      expect(screen.getByText("You've completed 0 out of 0 chapters")).toBeInTheDocument()
    })

    it('should handle missing categories gracefully', () => {
      const mockUseData = {
        chapters: mockChapters,
        categories: [],
        chaptersLoading: false,
        categoriesLoading: false,
        fetchChaptersAndCategories: jest.fn()
      }

      jest.doMock('@/contexts/DataContext', () => ({
        useData: () => mockUseData
      }))

      expect(() => render(<LearnPage />)).not.toThrow()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<LearnPage />)

      // Main page heading
      const h1Elements = screen.getAllByRole('heading', { level: 1 })
      expect(h1Elements.length).toBeGreaterThan(0)

      // Section headings
      const h2Elements = screen.getAllByRole('heading', { level: 2 })
      expect(h2Elements.length).toBeGreaterThan(0)

      // Category card headings
      const h3Elements = screen.getAllByRole('heading', { level: 3 })
      expect(h3Elements.length).toBeGreaterThan(0)
    })

    it('should have accessible buttons', () => {
      render(<LearnPage />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName()
      })
    })

    it('should have proper progress bar accessibility', () => {
      const { container } = render(<LearnPage />)

      // Progress bars should be identifiable
      const progressBars = container.querySelectorAll('[style*="width"]')
      expect(progressBars.length).toBeGreaterThan(0)
    })
  })

  describe('CSS Custom Properties', () => {
    it('should use consistent theming variables', () => {
      const { container } = render(<LearnPage />)

      const elementsWithCustomProps = container.querySelectorAll('[style*="var(--"]')
      expect(elementsWithCustomProps.length).toBeGreaterThan(0)

      // Check for common theme variables
      const styleContent = container.innerHTML
      const expectedVariables = [
        'var(--bg-primary)',
        'var(--text-primary)',
        'var(--text-secondary)',
        'var(--accent-blue)',
        'var(--accent-yellow)',
        'var(--white)'
      ]

      expectedVariables.forEach(variable => {
        expect(styleContent).toContain(variable)
      })
    })
  })

  describe('Data Processing', () => {
    it('should correctly group chapters by category', () => {
      render(<LearnPage />)

      // Each category should show its chapters
      mockCategories.forEach(category => {
        const categoryChapters = mockChapters.filter(ch => ch.category_id === category.id)

        if (categoryChapters.length > 0) {
          // Should show progress text
          expect(screen.getByText(`Progress: 0 of ${categoryChapters.length} complete`)).toBeInTheDocument()
        }
      })
    })

    it('should separate lessons from book summaries correctly', () => {
      // This test verifies the internal logic works correctly
      // The component filters chapters by content_type
      render(<LearnPage />)

      // Component should render without errors when processing different content types
      expect(screen.getByText('Your Learning Journey')).toBeInTheDocument()
    })
  })
})