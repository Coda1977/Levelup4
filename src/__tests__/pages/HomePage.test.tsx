import React from 'react'
import { render, screen, fireEvent, act } from '../utils/test-utils'
import HomePage from '@/app/page'

// Use the existing window.location mock from jest.setup.js
const mockLocation = window.location as any

// Reset mock functions before each test
beforeEach(() => {
  mockLocation.href = ''
  mockLocation.assign.mockClear()
  mockLocation.replace.mockClear()
})

// Mock IntersectionObserver for scroll animations
const mockObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn()
}))
global.IntersectionObserver = mockObserver

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocation.href = ''
  })

  describe('Rendering', () => {
    it('should render hero section with main heading', () => {
      render(<HomePage />)

      expect(screen.getByText('Transforming Insight')).toBeInTheDocument()
      expect(screen.getByText('into Action')).toBeInTheDocument()
    })

    it('should render Get Started buttons', () => {
      render(<HomePage />)

      const buttons = screen.getAllByText('Get Started')
      expect(buttons).toHaveLength(2) // Desktop and mobile versions

      buttons.forEach(button => {
        expect(button.tagName).toBe('BUTTON')
      })
    })

    it('should render features section', () => {
      render(<HomePage />)

      expect(screen.getByText('No more "What was that tool again?"')).toBeInTheDocument()
      expect(screen.getByText("You've completed the training.")).toBeInTheDocument()
      expect(screen.getByText('Now make it stick.')).toBeInTheDocument()
    })

    it('should render value proposition text', () => {
      render(<HomePage />)

      expect(screen.getByText('Level Up transforms management insights into daily practice')).toBeInTheDocument()
      expect(screen.getByText(/Build the leadership habits that make a lasting impact/)).toBeInTheDocument()
    })
  })

  describe('Simple by Design section', () => {
    it('should render all three feature cards', () => {
      render(<HomePage />)

      expect(screen.getByText('Simple by Design')).toBeInTheDocument()

      // Check all three cards
      expect(screen.getByText('01')).toBeInTheDocument()
      expect(screen.getByText('Learn on the Go')).toBeInTheDocument()
      expect(screen.getByText('5-minute lessons with videos and podcasts for busy schedules.')).toBeInTheDocument()

      expect(screen.getByText('02')).toBeInTheDocument()
      expect(screen.getByText('Personalized Guidance')).toBeInTheDocument()
      expect(screen.getByText('Chat with an AI mentor to tackle real situations.')).toBeInTheDocument()

      expect(screen.getByText('03')).toBeInTheDocument()
      expect(screen.getByText('Dive Deep')).toBeInTheDocument()
      expect(screen.getByText('Long-form summaries of the greatest management books.')).toBeInTheDocument()
    })

    it('should have proper card styling classes', () => {
      render(<HomePage />)

      const cards = screen.getAllByText(/01|02|03/).map(el =>
        el.closest('.hover-lift')
      ).filter(Boolean)

      expect(cards).toHaveLength(3)
      cards.forEach(card => {
        expect(card).toHaveClass('hover-lift')
        expect(card).toHaveClass('transition-all')
      })
    })
  })

  describe('Navigation', () => {
    it('should navigate to /learn when Get Started button is clicked', () => {
      render(<HomePage />)

      const getStartedButtons = screen.getAllByText('Get Started')
      const mainButton = getStartedButtons[0] // Desktop version

      fireEvent.click(mainButton)

      expect(mockLocation.href).toBe('/learn')
    })

    it('should navigate to /learn when mobile Get Started button is clicked', () => {
      render(<HomePage />)

      const getStartedButtons = screen.getAllByText('Get Started')
      const mobileButton = getStartedButtons[1] // Mobile version

      fireEvent.click(mobileButton)

      expect(mockLocation.href).toBe('/learn')
    })
  })

  describe('Visual Elements', () => {
    it('should render geometric background shapes', () => {
      const { container } = render(<HomePage />)

      // Check for geometric shapes in hero section
      const heroGeometricShapes = container.querySelectorAll('.absolute.top-20, .absolute.bottom-32, .absolute.top-1\\/3')
      expect(heroGeometricShapes.length).toBeGreaterThan(0)

      // Check for SVG polygon
      const polygon = container.querySelector('polygon')
      expect(polygon).toBeInTheDocument()
    })

    it('should render 3D cube visual element', () => {
      const { container } = render(<HomePage />)

      // Check for the cube structure
      const cubeContainer = container.querySelector('.w-48.h-48')
      expect(cubeContainer).toBeInTheDocument()

      // Check for the layered cube effect
      const cubeLayers = container.querySelectorAll('.absolute.inset-0, .absolute.inset-2, .absolute.inset-4')
      expect(cubeLayers.length).toBeGreaterThan(0)
    })

    it('should have mobile sticky CTA with proper responsive classes', () => {
      const { container } = render(<HomePage />)

      const stickyButton = container.querySelector('.fixed.bottom-4.left-4.right-4')
      expect(stickyButton).toBeInTheDocument()
      expect(stickyButton).toHaveClass('lg:hidden') // Should be hidden on large screens
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<HomePage />)

      // Main hero heading
      const h1Elements = screen.getAllByRole('heading', { level: 1 })
      expect(h1Elements.length).toBeGreaterThan(0)

      // Section headings
      const h2Elements = screen.getAllByRole('heading', { level: 2 })
      expect(h2Elements.length).toBeGreaterThan(0)

      // Feature card headings
      const h3Elements = screen.getAllByRole('heading', { level: 3 })
      expect(h3Elements.length).toBe(3) // Three feature cards
    })

    it('should have accessible buttons with proper text', () => {
      render(<HomePage />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName()
      })
    })

    it('should have proper aria-hidden for decorative elements', () => {
      const { container } = render(<HomePage />)

      const decorativeElements = container.querySelectorAll('[aria-hidden="true"]')
      expect(decorativeElements.length).toBeGreaterThan(0)
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive text classes', () => {
      const { container } = render(<HomePage />)

      // Check for responsive text sizing
      const responsiveText = container.querySelectorAll('[class*="clamp"], [class*="md:text-"], [class*="lg:text-"]')
      expect(responsiveText.length).toBeGreaterThan(0)
    })

    it('should have responsive layout classes', () => {
      const { container } = render(<HomePage />)

      // Check for responsive flex/grid layouts
      const responsiveLayouts = container.querySelectorAll('[class*="md:flex-row"], [class*="lg:flex-row"], [class*="md:grid-cols"], [class*="lg:grid-cols"]')
      expect(responsiveLayouts.length).toBeGreaterThan(0)
    })

    it('should have responsive padding and margins', () => {
      const { container } = render(<HomePage />)

      // Check for responsive spacing
      const responsiveSpacing = container.querySelectorAll('[class*="md:py-"], [class*="md:px-"], [class*="lg:gap-"]')
      expect(responsiveSpacing.length).toBeGreaterThan(0)
    })
  })

  describe('Scroll Animation Setup', () => {
    it('should initialize IntersectionObserver for scroll animations', () => {
      render(<HomePage />)

      // Should create observers for hero, features, and design sections
      expect(mockObserver).toHaveBeenCalledTimes(3)

      // Check observer configuration
      const observerCalls = mockObserver.mock.calls
      observerCalls.forEach(call => {
        const callback = call[0]
        const options = call[1]

        expect(typeof callback).toBe('function')
        expect(options).toEqual({ threshold: 0.15 })
      })
    })

    it('should have proper animation classes', () => {
      const { container } = render(<HomePage />)

      // Check for animation transition classes
      const animatedSections = container.querySelectorAll('.transition-opacity')
      expect(animatedSections.length).toBe(3) // Hero, features, design sections

      // Each should have duration class
      animatedSections.forEach(section => {
        expect(section).toHaveClass('duration-700')
      })
    })
  })

  describe('CSS Custom Properties', () => {
    it('should use CSS custom properties for theming', () => {
      const { container } = render(<HomePage />)

      // Check for style attributes using CSS custom properties
      const elementsWithCustomProps = container.querySelectorAll('[style*="var(--"]')
      expect(elementsWithCustomProps.length).toBeGreaterThan(0)

      // Should use consistent color variables
      const colorVariables = [
        'var(--bg-primary)',
        'var(--text-primary)',
        'var(--text-secondary)',
        'var(--accent-blue)',
        'var(--accent-yellow)',
        'var(--white)'
      ]

      const styleContent = container.innerHTML
      colorVariables.forEach(variable => {
        expect(styleContent).toContain(variable)
      })
    })
  })

  describe('Performance', () => {
    it('should not cause memory leaks with event listeners', () => {
      const { unmount } = render(<HomePage />)

      // Mock the observer instances
      const observerInstances = mockObserver.mock.results.map(result => result.value)

      // Unmount component
      act(() => {
        unmount()
      })

      // Should disconnect all observers
      observerInstances.forEach(observer => {
        expect(observer.disconnect).toHaveBeenCalled()
      })
    })

    it('should handle multiple renders without issues', () => {
      expect(() => {
        render(<HomePage />)
        render(<HomePage />)
        render(<HomePage />)
      }).not.toThrow()
    })
  })
})