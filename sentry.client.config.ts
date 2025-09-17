import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in production

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Release tracking
    environment: process.env.NODE_ENV,

    // Ignore specific errors
    ignoreErrors: [
      // Ignore browser extension errors
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Ignore network errors that are user's fault
      'NetworkError',
      'Network request failed',
      // Ignore user cancellations
      'AbortError',
      'Non-Error promise rejection captured'
    ],

    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from URLs
      if (event.request?.url) {
        event.request.url = event.request.url.replace(/token=[^&]+/, 'token=[FILTERED]')
      }

      // Remove password fields from data
      if (event.extra) {
        Object.keys(event.extra).forEach(key => {
          if (key.toLowerCase().includes('password') ||
              key.toLowerCase().includes('secret') ||
              key.toLowerCase().includes('key')) {
            delete event.extra![key]
          }
        })
      }

      return event
    },

    integrations: [
      Sentry.replayIntegration({
        // Mask all text content for privacy
        maskAllText: true,
        // Block all media for privacy
        blockAllMedia: true,
      })
    ]
  })
}