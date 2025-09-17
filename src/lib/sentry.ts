import * as Sentry from '@sentry/nextjs'

/**
 * Capture exception with additional context
 */
export function captureException(
  error: Error,
  context?: {
    user?: { id?: string; email?: string }
    tags?: Record<string, string>
    extra?: Record<string, any>
  }
) {
  // Only capture in production or if explicitly enabled in dev
  if (process.env.NODE_ENV === 'development' &&
      process.env.SENTRY_DEV_ENABLED !== 'true') {
    console.error('Error captured (dev mode):', error)
    return
  }

  Sentry.withScope((scope) => {
    // Set user context
    if (context?.user) {
      scope.setUser({
        id: context.user.id,
        email: context.user.email,
      })
    }

    // Set tags
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value)
      })
    }

    // Set extra context (but filter sensitive data)
    if (context?.extra) {
      const filteredExtra = { ...context.extra }
      Object.keys(filteredExtra).forEach(key => {
        if (key.toLowerCase().includes('password') ||
            key.toLowerCase().includes('secret') ||
            key.toLowerCase().includes('key') ||
            key.toLowerCase().includes('token')) {
          delete filteredExtra[key]
        }
      })
      scope.setContext('extra', filteredExtra)
    }

    Sentry.captureException(error)
  })
}

/**
 * Capture a message with context
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
) {
  // Only capture in production
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${level.toUpperCase()}]`, message, context)
    return
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('details', context)
    }
    Sentry.captureMessage(message, level)
  })
}

/**
 * Wrap an API handler with Sentry error capturing
 */
export function withSentry<T extends (...args: any[]) => any>(
  handler: T,
  options?: {
    tags?: Record<string, string>
    captureClientErrors?: boolean
  }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args)
    } catch (error) {
      const err = error as Error

      // Check if it's a client error (4xx)
      const isClientError = err.message?.includes('400') ||
                           err.message?.includes('401') ||
                           err.message?.includes('403') ||
                           err.message?.includes('404')

      // Only capture server errors by default
      if (!isClientError || options?.captureClientErrors) {
        captureException(err, {
          tags: {
            ...options?.tags,
            handler: handler.name || 'anonymous',
          },
        })
      }

      throw error
    }
  }) as T
}