#!/bin/bash

# LevelUp Testing Suite Runner
# Run all tests to ensure platform readiness

echo "🧪 LevelUp Platform Testing Suite"
echo "=================================="
echo ""

# Check if server is running
echo "Checking if server is running on port 3000..."
if ! curl -s http://localhost:3000 > /dev/null; then
  echo "❌ Server not running! Please start with: npm run dev"
  exit 1
fi
echo "✅ Server is running"
echo ""

# Run User Acceptance Tests
echo "1️⃣ Running User Acceptance Tests..."
echo "----------------------------------"
node test-user-acceptance.js

if [ $? -ne 0 ]; then
  echo "❌ User Acceptance Tests failed!"
  echo "Please fix the issues before proceeding."
  exit 1
fi

echo ""
echo "2️⃣ Running Load Tests (10 concurrent users)..."
echo "--------------------------------------------"
node test-load.js

if [ $? -ne 0 ]; then
  echo "⚠️ Load tests encountered issues"
  echo "Review the results above for recommendations"
fi

echo ""
echo "✅ All tests complete!"
echo ""
echo "Next steps:"
echo "1. Review any warnings or recommendations"
echo "2. Create test users in Supabase if needed"
echo "3. Run stress test with: node test-load.js stress"
echo "4. Monitor production with Sentry after deployment"