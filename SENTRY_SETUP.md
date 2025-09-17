# Sentry Setup Guide for LevelUp

## Quick Setup (5 minutes)

1. **Create a Sentry account** (free tier is sufficient)
   - Go to https://sentry.io
   - Sign up for free account
   - Create a new project, select "Next.js"

2. **Get your DSN**
   - In Sentry dashboard, go to Settings → Projects → Your Project → Client Keys (DSN)
   - Copy the DSN (looks like: `https://abc123@o123456.ingest.sentry.io/123456`)

3. **Add to your .env.local file:**
```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=your-dsn-here
SENTRY_DSN=your-dsn-here

# Optional: Enable Sentry in development
SENTRY_DEV_ENABLED=false
```

4. **That's it!** Sentry will now:
   - Capture all unhandled errors
   - Track errors in API routes
   - Monitor React component crashes
   - Provide user context for debugging

## What Gets Tracked

### Automatically Captured:
- ✅ Unhandled JavaScript errors
- ✅ React component errors (via Error Boundaries)
- ✅ API route errors
- ✅ Network failures
- ✅ Promise rejections

### Privacy Protection:
- 🔒 Passwords/secrets are filtered out
- 🔒 User sessions are anonymized
- 🔒 Text content is masked in replays
- 🔒 Only 10% of sessions are sampled

### What's NOT Captured:
- ❌ User inputs or form data
- ❌ Personal information beyond user ID
- ❌ Cookie values
- ❌ Authorization headers

## Critical Errors to Monitor

Sentry will alert you for these critical issues:
1. **Authentication failures** - Session timeouts, invalid tokens
2. **Database errors** - Connection issues, query failures
3. **Admin operations** - Chapter CRUD failures
4. **AI Chat errors** - Claude API failures, streaming issues
5. **Payment/billing errors** - If you add payments later

## Testing Sentry Integration

### Test in Development:
```bash
# Enable Sentry in dev mode
SENTRY_DEV_ENABLED=true npm run dev

# Visit http://localhost:3000/test-sentry (create this test page)
```

### Test Page Example:
```tsx
// src/app/test-sentry/page.tsx
export default function TestSentry() {
  return (
    <button onClick={() => {
      throw new Error('Test Sentry Error')
    }}>
      Trigger Test Error
    </button>
  )
}
```

## Production Checklist

Before launching:
- [ ] DSN is set in production environment variables
- [ ] Test error appears in Sentry dashboard
- [ ] Email alerts are configured for critical errors
- [ ] Rate limiting prevents spam (already configured)

## Monitoring Dashboard

After setup, monitor these metrics:
- **Error Rate** - Should be <1% of sessions
- **Crash Free Rate** - Target >99.5%
- **Most Common Errors** - Fix top 3 weekly
- **User Feedback** - Enable user reports for context

## Cost Management

Free tier includes:
- 5,000 errors/month
- 10,000 performance transactions
- 50 replays/month
- 1 team member

This is plenty for your first 100-500 users!

## Need Help?

- Sentry Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Test your setup: Check if errors appear in dashboard within 1 minute
- Common issue: If no errors appear, check your DSN is correct