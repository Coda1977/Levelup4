# LevelUp Platform Testing Guide

## 🎯 Testing Overview

This guide covers testing procedures to ensure LevelUp can handle real users effectively.

## Test Types

### 1. User Acceptance Testing (UAT)
Tests critical user journeys end-to-end to ensure the platform works correctly.

**What it tests:**
- ✅ Public access (homepage, login, signup)
- ✅ Authentication flow (login, protected routes, session timeout)
- ✅ User journey (view chapters, track progress, AI chat)
- ✅ Admin functions (CRUD operations, access control)
- ✅ Error handling (rate limiting, validation, XSS prevention)
- ✅ Performance (response times, page load speeds)

**Run with:**
```bash
node test-user-acceptance.js
```

### 2. Load Testing
Simulates multiple concurrent users to ensure platform stability under load.

**What it tests:**
- ✅ 10 concurrent users performing realistic actions
- ✅ Response time percentiles (P50, P95, P99)
- ✅ Success rate under load
- ✅ Database connection pooling
- ✅ API rate limiting effectiveness

**Run with:**
```bash
# Standard load test (10 users, 30 seconds)
node test-load.js

# Stress test (finds breaking point)
node test-load.js stress
```

### 3. Quick Test Suite
Runs all tests in sequence:

```bash
./run-tests.sh
```

## Pre-Test Setup

### 1. Create Test Users in Supabase

Create these users in your Supabase dashboard:

**Regular Users:**
```sql
-- Run in Supabase SQL Editor
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES
  ('test.user@levelup.com', crypt('TestUser123!', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('loadtest.user1@levelup.com', crypt('LoadTest123!', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('loadtest.user2@levelup.com', crypt('LoadTest123!', gen_salt('bf')), NOW(), NOW(), NOW())
  -- ... up to loadtest.user10@levelup.com
;

-- Create profiles
INSERT INTO user_profiles (id, first_name, last_name, is_admin)
SELECT id, 'Test', 'User', false FROM auth.users WHERE email LIKE '%levelup.com';
```

**Admin User:**
```sql
-- Create admin user
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES ('test.admin@levelup.com', crypt('TestAdmin123!', gen_salt('bf')), NOW(), NOW(), NOW());

-- Set admin privileges
UPDATE user_profiles
SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'test.admin@levelup.com');
```

### 2. Ensure Server is Running
```bash
npm run dev
# Server should be running on http://localhost:3000
```

## Test Results Interpretation

### UAT Results

**PASSED Example:**
```
📊 Test Results
Total Tests: 25
Passed: 25 ✅
Failed: 0
Duration: 12.5 seconds

✅ All tests passed! Platform is ready for users.
```

**FAILED Example:**
```
Failed Tests:
  ❌ Admin login: Status 500
  ❌ Rate limiting enforced: Rate limiting not triggered
```
→ Fix these specific issues before launch

### Load Test Results

**Good Performance:**
```
Summary:
  Requests/Second: 45.2
  Success Rate: 98.5%

Response Times:
  Median (P50): 120ms ✅
  P95: 450ms ✅
  P99: 890ms ✅

🎉 LOAD TEST PASSED! Platform can handle 10 concurrent users.
```

**Needs Optimization:**
```
Response Times:
  P95: 2500ms ❌ (> 1 second)

Recommendations:
  - Consider caching frequently accessed data
  - Monitor database connection pool size
```

## Performance Targets

Your platform should meet these targets for 10 concurrent users:

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Success Rate | >99% | >95% | <95% |
| P50 Response | <200ms | <500ms | >500ms |
| P95 Response | <500ms | <1000ms | >1000ms |
| P99 Response | <1000ms | <2000ms | >2000ms |
| Error Rate | <1% | <5% | >5% |

## Common Issues & Solutions

### Issue: "Rate limiting not triggered"
**Solution:** Rate limiter might be disabled in dev. Check `src/lib/rate-limiter.ts`

### Issue: "Login failed for all users"
**Solution:** Test users don't exist in database. Run the SQL setup above.

### Issue: "P95 response time > 1 second"
**Solutions:**
- Enable database query caching
- Add indexes on frequently queried columns
- Implement Redis for session storage
- Use CDN for static assets

### Issue: "Only 5/10 users could connect"
**Solutions:**
- Increase Supabase connection pool size
- Check Node.js memory limits
- Review database connection handling

## Production Readiness Checklist

Before launching with real users:

- [ ] **UAT**: All tests passing (25/25)
- [ ] **Load Test**: Can handle 10+ concurrent users
- [ ] **Response Times**: P95 < 1 second
- [ ] **Success Rate**: > 95% under load
- [ ] **Error Handling**: Graceful failures, no data loss
- [ ] **Monitoring**: Sentry configured and tested
- [ ] **Backup Plan**: Database backups scheduled

## Continuous Testing

After launch, run tests regularly:

1. **Before each deployment**: Run UAT tests
2. **Weekly**: Run load tests to catch performance regressions
3. **After major changes**: Run stress tests
4. **Monthly**: Review Sentry errors and fix top issues

## Advanced Testing (Optional)

### Database Load Testing
```sql
-- Test query performance with EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT * FROM chapters c
JOIN user_progress up ON up.chapter_id = c.id
WHERE up.user_id = 'test-user-id';
```

### API Endpoint Testing with curl
```bash
# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```

### Browser Testing
1. Open Chrome DevTools
2. Go to Network tab → Throttling → "Slow 3G"
3. Test if app still works on slow connections

## Need Help?

- **Tests failing?** Check server logs: Look for error patterns
- **Performance issues?** Use Chrome DevTools Performance tab
- **Database slow?** Check Supabase dashboard for slow queries
- **Errors in production?** Check Sentry dashboard immediately