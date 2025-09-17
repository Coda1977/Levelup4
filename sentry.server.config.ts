import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Release tracking
    environment: process.env.NODE_ENV,

    // Capture console errors
    integrations: [
      Sentry.captureConsoleIntegration({
        levels: ['error', 'warn']
      })
    ],

    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['cookie']
        delete event.request.headers['authorization']
        delete event.request.headers['x-supabase-auth']
      }

      // Remove sensitive data from extra context
      if (event.extra) {
        Object.keys(event.extra).forEach(key => {
          if (key.toLowerCase().includes('password') ||
              key.toLowerCase().includes('secret') ||
              key.toLowerCase().includes('key') ||
              key.toLowerCase().includes('token')) {
            delete event.extra![key]
          }
        })
      }

      // Don't send events in development unless explicitly enabled
      if (process.env.NODE_ENV === 'development' &&
          process.env.SENTRY_DEV_ENABLED !== 'true') {
        return null
      }

      return event
    }
  })
}