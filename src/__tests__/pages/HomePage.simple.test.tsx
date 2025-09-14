import React from 'react'
import { render, screen } from '@testing-library/react'
import HomePage from '@/app/page'

// Simple mocks
const mockIntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn()
}))
global.IntersectionObserver = mockIntersectionObserver

// Mock window.location
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true,
  configurable: true
})

describe('HomePage - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render main heading', () => {
    render(<HomePage />)

    expect(screen.getByText('Transforming Insight')).toBeInTheDocument()
    expect(screen.getByText('into Action')).toBeInTheDocument()
  })

  it('should render Get Started button', () => {
    render(<HomePage />)

    const buttons = screen.getAllByText('Get Started')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('should render features section', () => {
    render(<HomePage />)

    expect(screen.getByText('Simple by Design')).toBeInTheDocument()
    expect(screen.getByText('Learn on the Go')).toBeInTheDocument()
    expect(screen.getByText('Personalized Guidance')).toBeInTheDocument()
    expect(screen.getByText('Dive Deep')).toBeInTheDocument()
  })

  it('should render value proposition', () => {
    render(<HomePage />)

    expect(screen.getByText('Level Up transforms management insights into daily practice')).toBeInTheDocument()
  })
})