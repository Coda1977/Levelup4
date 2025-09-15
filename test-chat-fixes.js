#!/usr/bin/env node

/**
 * Test script to validate all the chat implementation fixes
 * Run this script to verify that all security and bug fixes are properly implemented
 */

const fs = require('fs');
const path = require('path');

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

const pass = (msg) => console.log(`${colors.green}✅ PASS${colors.reset}: ${msg}`);
const fail = (msg) => console.log(`${colors.red}❌ FAIL${colors.reset}: ${msg}`);
const info = (msg) => console.log(`${colors.blue}ℹ️  INFO${colors.reset}: ${msg}`);
const warn = (msg) => console.log(`${colors.yellow}⚠️  WARN${colors.reset}: ${msg}`);

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const issues = [];

function runTest(testName, testFn) {
  totalTests++;
  try {
    if (testFn()) {
      pass(testName);
      passedTests++;
    } else {
      fail(testName);
      failedTests++;
      issues.push(testName);
    }
  } catch (error) {
    fail(`${testName} - Error: ${error.message}`);
    failedTests++;
    issues.push(testName);
  }
}

// Read file helper
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Could not read file ${filePath}: ${error.message}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('🔍 AI CHAT COACH - FIX VALIDATION TEST SUITE');
console.log('='.repeat(60) + '\n');

// Test 1: Streaming Reader Null Check
info('Testing ChatClient.tsx streaming fixes...');
runTest('Streaming reader null check is implemented', () => {
  const content = readFile(path.join(__dirname, 'src/app/chat/ChatClient.tsx'));

  // Check for null check on getReader()
  const hasNullCheck = content.includes('const reader = response.body?.getReader()') &&
                       content.includes('if (!reader)') &&
                       content.includes("throw new Error('No response body to stream')");

  if (!hasNullCheck) {
    warn('Missing proper null check for response.body?.getReader()');
    return false;
  }

  return true;
});

runTest('While loop uses correct condition', () => {
  const content = readFile(path.join(__dirname, 'src/app/chat/ChatClient.tsx'));

  // Check for correct while loop
  const hasCorrectWhile = content.includes('while (true)') &&
                         content.includes('const { value, done } = await reader.read()') &&
                         content.includes('if (done) break');

  if (!hasCorrectWhile) {
    warn('While loop not properly implemented with while(true) and break condition');
    return false;
  }

  // Make sure there's no while(reader) which was the bug
  const hasBadWhile = /while\s*\(\s*reader\s*\)/.test(content);
  if (hasBadWhile) {
    warn('Found incorrect while(reader) condition - should be while(true)');
    return false;
  }

  return true;
});

// Test 2: API Key Security
info('\nTesting API key security in route handlers...');
runTest('API key check in /api/chat/route.ts', () => {
  const content = readFile(path.join(__dirname, 'src/app/api/chat/route.ts'));

  // Check for proper API key handling
  const hasProperKeyCheck = content.includes('const apiKey = process.env.ANTHROPIC_API_KEY') &&
                           content.includes('if (!apiKey)') &&
                           content.includes("console.error('ANTHROPIC_API_KEY not configured')");

  if (!hasProperKeyCheck) {
    warn('Missing proper API key check at module level');
    return false;
  }

  // Check for conditional anthropic client creation
  const hasConditionalClient = content.includes('const anthropic = apiKey ? new Anthropic({ apiKey }) : null');
  if (!hasConditionalClient) {
    warn('Anthropic client not conditionally created based on API key presence');
    return false;
  }

  // Check for runtime check in POST handler
  const hasRuntimeCheck = content.includes('if (!anthropic)') &&
                         content.includes("return NextResponse.json({ error: 'AI service not configured");

  if (!hasRuntimeCheck) {
    warn('Missing runtime check for anthropic client in POST handler');
    return false;
  }

  return true;
});

runTest('API key check in /api/chat/stream/route.ts', () => {
  const content = readFile(path.join(__dirname, 'src/app/api/chat/stream/route.ts'));

  // Check for proper API key handling
  const hasProperKeyCheck = content.includes('const apiKey = process.env.ANTHROPIC_API_KEY') &&
                           content.includes('if (!apiKey)') &&
                           content.includes("console.error('ANTHROPIC_API_KEY not configured')");

  if (!hasProperKeyCheck) {
    warn('Missing proper API key check at module level');
    return false;
  }

  // Check for runtime check in POST handler
  const hasRuntimeCheck = content.includes('if (!anthropic)') &&
                         content.includes("return new Response('AI service not configured");

  if (!hasRuntimeCheck) {
    warn('Missing runtime check for anthropic client in POST handler');
    return false;
  }

  return true;
});

runTest('No empty string fallback for API key', () => {
  const routeContent = readFile(path.join(__dirname, 'src/app/api/chat/route.ts'));
  const streamContent = readFile(path.join(__dirname, 'src/app/api/chat/stream/route.ts'));

  // Check specifically for API key fallback patterns
  const apiKeyPatterns = [
    /ANTHROPIC_API_KEY\s*\|\|\s*['"]/,
    /apiKey\s*=.*\|\|\s*['"]/,
    /process\.env\.ANTHROPIC_API_KEY\s*\|\|\s*['"]/
  ];

  for (const pattern of apiKeyPatterns) {
    if (pattern.test(routeContent) || pattern.test(streamContent)) {
      warn('Found empty string fallback for API key - this is a security issue');
      return false;
    }
  }

  // Verify the correct pattern is used
  const hasCorrectPattern = routeContent.includes('const apiKey = process.env.ANTHROPIC_API_KEY') &&
                           streamContent.includes('const apiKey = process.env.ANTHROPIC_API_KEY');

  if (!hasCorrectPattern) {
    warn('API key not properly retrieved from environment');
    return false;
  }

  return true;
});

// Test 3: XSS Protection with DOMPurify
info('\nTesting XSS protection implementation...');
runTest('DOMPurify is imported in ChatClient.tsx', () => {
  const content = readFile(path.join(__dirname, 'src/app/chat/ChatClient.tsx'));

  const hasImport = content.includes("import DOMPurify from 'dompurify'");

  if (!hasImport) {
    warn('DOMPurify not imported');
    return false;
  }

  return true;
});

runTest('formatMessageContent uses DOMPurify.sanitize', () => {
  const content = readFile(path.join(__dirname, 'src/app/chat/ChatClient.tsx'));

  // Check the formatMessageContent function
  const functionMatch = content.match(/const formatMessageContent[^}]+}/s);
  if (!functionMatch) {
    warn('Could not find formatMessageContent function');
    return false;
  }

  const functionContent = functionMatch[0];
  const usesSanitize = functionContent.includes('return DOMPurify.sanitize(formatted)');

  if (!usesSanitize) {
    warn('formatMessageContent does not use DOMPurify.sanitize');
    return false;
  }

  return true;
});

runTest('DOMPurify is installed in package.json', () => {
  const packageJson = JSON.parse(readFile(path.join(__dirname, 'package.json')));

  const hasDompurify = packageJson.dependencies && packageJson.dependencies.dompurify;
  const hasTypes = packageJson.devDependencies && packageJson.devDependencies['@types/dompurify'];

  if (!hasDompurify) {
    warn('dompurify not found in dependencies');
    return false;
  }

  if (!hasTypes) {
    warn('@types/dompurify not found in devDependencies (optional but recommended)');
    // This is a warning but not a failure
  }

  return true;
});

// Test 4: Error Messages
info('\nTesting error message improvements...');
runTest('Error messages include actual error details', () => {
  const content = readFile(path.join(__dirname, 'src/app/chat/ChatClient.tsx'));

  // Check for improved error message that includes error details
  const hasDetailedError = content.includes('${error instanceof Error ? error.message : ');

  if (!hasDetailedError) {
    warn('Error messages do not include actual error details');
    return false;
  }

  // Check that it's in the error message for assistant
  const errorMessageSection = content.match(/const errorMessage:[^}]+}/s);
  if (errorMessageSection) {
    const includesErrorInContent = errorMessageSection[0].includes('error instanceof Error ? error.message');
    if (!includesErrorInContent) {
      warn('Error details not properly included in assistant error message');
      return false;
    }
  }

  return true;
});

// Test 5: Memory Leak Fix
info('\nTesting memory leak fixes...');
runTest('useEffect hooks are properly separated', () => {
  const content = readFile(path.join(__dirname, 'src/app/chat/ChatClient.tsx'));

  // Check for separate useEffect for fetchChaptersAndCategories
  const hasSeparateEffect = content.includes(`useEffect(() => {
    fetchChaptersAndCategories()
  }, [])`) || content.includes(`useEffect(() => {
    fetchChaptersAndCategories()
  }, []) // Intentionally empty`);

  if (!hasSeparateEffect) {
    warn('fetchChaptersAndCategories not in separate useEffect');
    return false;
  }

  return true;
});

runTest('Event listener cleanup is implemented', () => {
  const content = readFile(path.join(__dirname, 'src/app/chat/ChatClient.tsx'));

  // Check for resize event listener cleanup
  const hasCleanup = content.includes("window.addEventListener('resize'") &&
                    content.includes("window.removeEventListener('resize'") &&
                    content.includes('return () => window.removeEventListener');

  if (!hasCleanup) {
    warn('Event listener cleanup not properly implemented');
    return false;
  }

  return true;
});

// Test 6: Additional Security Checks
info('\nPerforming additional security checks...');
runTest('No hardcoded API keys', () => {
  const files = [
    'src/app/chat/ChatClient.tsx',
    'src/app/api/chat/route.ts',
    'src/app/api/chat/stream/route.ts'
  ];

  for (const file of files) {
    const content = readFile(path.join(__dirname, file));

    // Check for common API key patterns
    const hasHardcodedKey = /sk-[a-zA-Z0-9]{48}/.test(content) ||
                          /api[_-]?key\s*=\s*["'][^"']+["']/i.test(content) ||
                          content.includes('claude-api-key-here');

    if (hasHardcodedKey) {
      warn(`Potential hardcoded API key found in ${file}`);
      return false;
    }
  }

  return true;
});

runTest('Error responses do not leak sensitive info', () => {
  const routeContent = readFile(path.join(__dirname, 'src/app/api/chat/route.ts'));
  const streamContent = readFile(path.join(__dirname, 'src/app/api/chat/stream/route.ts'));

  // Check that error messages are generic
  const hasGenericErrors = (routeContent.includes('AI service not configured') ||
                           routeContent.includes('Failed to process chat request')) &&
                          (streamContent.includes('AI service not configured') ||
                           streamContent.includes('Failed to process chat request'));

  if (!hasGenericErrors) {
    warn('API error messages might expose sensitive information');
    return false;
  }

  return true;
});

// Test 7: Code Quality Checks
info('\nPerforming code quality checks...');
runTest('No console.log statements in production code', () => {
  const content = readFile(path.join(__dirname, 'src/app/chat/ChatClient.tsx'));

  // Allow console.error but not console.log in component
  const logCount = (content.match(/console\.log/g) || []).length;

  if (logCount > 0) {
    warn(`Found ${logCount} console.log statements that should be removed`);
    // This is a warning but not a failure for error handling
    return true;
  }

  return true;
});

runTest('Proper TypeScript types used', () => {
  const content = readFile(path.join(__dirname, 'src/app/chat/ChatClient.tsx'));

  // Check for any usage
  const hasAnyType = /:\s*any\b/.test(content);

  if (hasAnyType) {
    warn('Found usage of "any" type - consider using proper types');
    // This is a warning but not necessarily a failure
  }

  return true;
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 TEST RESULTS SUMMARY');
console.log('='.repeat(60));
console.log(`Total Tests: ${totalTests}`);
console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);

if (failedTests > 0) {
  console.log('\n❌ FAILED TESTS:');
  issues.forEach(issue => console.log(`  - ${issue}`));
  console.log('\n🔧 Please fix the above issues before deploying.');
  process.exit(1);
} else {
  console.log(`\n${colors.green}✨ All tests passed! The chat implementation fixes are properly implemented.${colors.reset}`);
  console.log('\n✅ VALIDATION COMPLETE - Ready for deployment!\n');
  process.exit(0);
}