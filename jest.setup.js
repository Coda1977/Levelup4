import '@testing-library/jest-dom'
import dotenv from 'dotenv'
import 'cross-fetch/polyfill'

// Load test environment variables
dotenv.config({ path: '.env.test' })

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock window.location - check if it's already defined
if (!window.location) {
  Object.defineProperty(window, 'location', {
    value: {
      href: '',
      assign: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      pathname: '/',
      search: '',
      hash: ''
    },
    writable: true,
    configurable: true
  })
}

// Don't mock fetch - we want real API calls to Supabase
// If fetch is not available in Node, it will be polyfilled by Supabase client

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url')
global.URL.revokeObjectURL = jest.fn()

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}