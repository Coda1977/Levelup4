# Testing Strategy for LevelUp4 Next.js + Supabase Application

## Overview

This document outlines the comprehensive testing strategy for the LevelUp4 application, a Next.js 15 + Supabase learning platform. The testing framework is built using Jest and React Testing Library to ensure reliable, maintainable, and comprehensive test coverage.

## Table of Contents

1. [Testing Architecture](#testing-architecture)
2. [Test Types and Coverage](#test-types-and-coverage)
3. [Testing Tools and Setup](#testing-tools-and-setup)
4. [Testing Guidelines](#testing-guidelines)
5. [Component Testing Strategies](#component-testing-strategies)
6. [Mocking Strategies](#mocking-strategies)
7. [Running Tests](#running-tests)
8. [Continuous Integration](#continuous-integration)
9. [Maintenance and Best Practices](#maintenance-and-best-practices)

## Testing Architecture

### Framework Stack
- **Test Runner**: Jest 30.x
- **Component Testing**: React Testing Library 16.x
- **User Interaction Testing**: User Event 14.x
- **Environment**: jsdom for DOM simulation
- **TypeScript Support**: ts-jest for TypeScript compilation

### Directory Structure
```
src/
├── __tests__/
│   ├── components/           # Component tests
│   ├── contexts/            # Context provider tests
│   ├── utils/               # Test utilities and helpers
│   └── __mocks__/           # Mock implementations
│       ├── supabase.ts      # Supabase client mocks
│       └── api.ts           # API response mocks
└── components/
    └── Component.test.tsx   # Co-located component tests (optional)
```

## Test Types and Coverage

### Unit Tests (70% of test suite)
- **DataContext**: State management, caching logic, API interactions
- **Components**: Individual component behavior, props handling, event handling
- **Utilities**: Helper functions, data transformations

### Integration Tests (25% of test suite)
- **Component Integration**: Parent-child component interactions
- **Context Integration**: Components using DataContext
- **API Integration**: Mock API calls and response handling

### End-to-End Tests (5% of test suite)
- **Critical User Journeys**: Admin CRUD operations, form submissions
- **Error Scenarios**: Network failures, validation errors

### Coverage Targets
- **Statements**: 70% minimum
- **Branches**: 70% minimum
- **Functions**: 70% minimum
- **Lines**: 70% minimum

## Testing Tools and Setup

### Core Dependencies
```json
{
  "@testing-library/jest-dom": "^6.8.0",
  "@testing-library/react": "^16.3.0",
  "@testing-library/user-event": "^14.6.1",
  "@types/jest": "^30.0.0",
  "jest": "^30.1.3",
  "jest-environment-jsdom": "^30.1.2",
  "ts-jest": "^29.4.1"
}
```

### Configuration Files
- **jest.config.js**: Main Jest configuration with Next.js integration
- **jest.setup.js**: Global test setup and mocks
- **src/__tests__/utils/test-utils.tsx**: Custom render function with providers

## Testing Guidelines

### What to Test
✅ **DO Test:**
- Component rendering with different props
- User interactions (clicks, typing, form submissions)
- State changes and context updates
- API call handling and error states
- Loading states and async operations
- Form validation and error handling
- Data transformations and business logic
- Cache invalidation and data consistency

❌ **DON'T Test:**
- Third-party library internals
- Implementation details (internal state)
- CSS styling and visual appearance
- Next.js framework behavior

### Test Structure (AAA Pattern)
```typescript
describe('ComponentName', () => {
  // Arrange - Setup
  beforeEach(() => {
    // Setup mocks and initial state
  })

  it('should perform expected behavior when condition', async () => {
    // Arrange - Test-specific setup
    const user = userEvent.setup()

    // Act - Perform action
    const { getByText } = render(<Component />)
    await user.click(getByText('Button'))

    // Assert - Verify results
    expect(mockFunction).toHaveBeenCalledWith(expectedArgs)
  })
})
```

## Component Testing Strategies

### DataContext Testing
**Focus Areas:**
- Cache management and expiration
- State updates and consistency
- Error handling and recovery
- API call optimization

**Key Test Cases:**
```typescript
// Cache validity tests
it('should not refetch if cache is still valid')
it('should refetch after cache expires')

// Error handling tests
it('should handle API errors gracefully')
it('should clear errors when retrying')

// State management tests
it('should update chapters in state when CRUD operation succeeds')
it('should maintain consistency between chapters and individualChapters')
```

### AdminPanelClient Testing
**Focus Areas:**
- User workflow completion
- Form state management
- Error message display
- Success confirmation

**Key Test Cases:**
```typescript
// User workflows
it('should complete chapter creation workflow')
it('should handle edit-cancel workflow correctly')

// Error scenarios
it('should display error messages with auto-dismiss')
it('should handle network failures gracefully')
```

### ChapterForm Testing
**Focus Areas:**
- Form validation
- Auto-save functionality
- Data transformation
- User experience flows

**Key Test Cases:**
```typescript
// Validation tests
it('should require title and category fields')
it('should validate URL fields format')

// Auto-save tests
it('should auto-save draft every 2 seconds')
it('should clear draft after successful submission')

// Data handling
it('should transform key takeaways from text to array')
it('should calculate reading time from content')
```

### ChapterList Testing
**Focus Areas:**
- Data filtering and search
- Sorting and ordering
- User interactions
- Performance optimization

**Key Test Cases:**
```typescript
// Search and filter
it('should filter chapters by title and preview text')
it('should handle case-insensitive search')

// Safety and robustness
it('should handle chapters with missing properties')
it('should gracefully handle null or undefined data')
```

## Mocking Strategies

### Supabase Client Mock
```typescript
// Located in: src/__tests__/__mocks__/supabase.ts
export const createMockSupabaseClient = () => ({
  from: (table: string) => mockQueryBuilder(table),
  auth: mockAuthMethods
})
```

### API Response Mock
```typescript
// Located in: src/__tests__/__mocks__/api.ts
export const setupFetchMock = (customResponses = {}) => {
  global.fetch = createMockFetch({
    '/api/admin/chapters': mockChaptersResponse,
    ...customResponses
  })
}
```

### Component Mocks
```typescript
// Mock heavy components for unit tests
jest.mock('@/components/TipTapEditor', () => ({
  TipTapEditor: ({ value, onChange }) => (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} />
  )
}))
```

## Running Tests

### Available Scripts
```bash
# Run all tests once
npm test

# Run tests in watch mode during development
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests for CI (no watch, with coverage)
npm run test:ci

# Debug failing tests
npm run test:debug

# Clear Jest cache
npm run test:clear
```

### Test Execution Patterns
```bash
# Run specific test file
npm test DataContext.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should handle API errors"

# Run tests for specific component
npm test -- --testPathPattern="ChapterForm"

# Update snapshots
npm test -- --updateSnapshot
```

## Continuous Integration

### GitHub Actions Integration
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:ci
      - run: npm run build # Ensure build works
```

### Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:ci && npm run lint"
    }
  }
}
```

## Maintenance and Best Practices

### Test Maintenance
- **Review and update mocks** when APIs change
- **Update test data** to reflect current schema
- **Refactor tests** when components are refactored
- **Remove obsolete tests** for deleted features

### Performance Optimization
- **Mock heavy dependencies** to keep tests fast
- **Use fake timers** for time-dependent tests
- **Batch API calls** in test setup
- **Clean up side effects** in afterEach blocks

### Code Quality
- **Descriptive test names** that explain the scenario
- **Clear assertions** that explain expected behavior
- **Consistent test structure** across the codebase
- **Regular test review** during code reviews

### Error Handling Testing
```typescript
// Test both success and failure scenarios
it('should handle successful API response')
it('should handle network timeout errors')
it('should handle validation errors')
it('should handle unauthorized errors')
```

### Accessibility Testing
```typescript
// Include basic accessibility checks
it('should have accessible form labels')
it('should provide keyboard navigation')
it('should have proper ARIA attributes')
```

## Future Enhancements

### Planned Additions
1. **Visual Regression Testing** with Chromatic or Percy
2. **Performance Testing** with Lighthouse CI
3. **API Contract Testing** with Pact
4. **Cross-browser Testing** with BrowserStack
5. **Load Testing** for admin operations

### Monitoring and Metrics
- **Test execution time** tracking
- **Flaky test** identification and resolution
- **Coverage trend** monitoring
- **Test reliability** metrics

---

## Quick Reference

### Common Test Patterns
```typescript
// Testing async operations
await waitFor(() => expect(element).toBeInTheDocument())

// Testing user interactions
const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
await user.click(button)
await user.type(input, 'text')

// Testing error states
mockApiCallError('/api/endpoint', 'Error message')
expect(getByText('Error message')).toBeInTheDocument()

// Testing loading states
expect(getByText('Loading...')).toBeInTheDocument()
await waitFor(() => expect(queryByText('Loading...')).not.toBeInTheDocument())
```

### Debug Commands
```bash
# Run single test with debug output
npm test -- --verbose --no-cache DataContext.test.tsx

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

This testing strategy ensures comprehensive coverage of the LevelUp4 application while maintaining test reliability, performance, and maintainability. Regular review and updates of this strategy will help maintain code quality as the application evolves.