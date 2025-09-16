-- Fix RLS Policies for LevelUp4 Application
-- This script ensures proper RLS policies for all tables

-- ========================================
-- 1. USER_PROFILES TABLE
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role full access" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON user_profiles;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Service role has full access (bypasses RLS automatically)
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile"
ON user_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow anon to read profiles (for public viewing if needed)
CREATE POLICY "Public profiles are viewable"
ON user_profiles FOR SELECT
TO anon
USING (true);

-- ========================================
-- 2. USER_PROGRESS TABLE
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON user_progress;
DROP POLICY IF EXISTS "Service role full access" ON user_progress;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_progress;
DROP POLICY IF EXISTS "Enable read access for users" ON user_progress;
DROP POLICY IF EXISTS "Enable update for users" ON user_progress;
DROP POLICY IF EXISTS "Enable delete for users" ON user_progress;

-- Enable RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own progress
CREATE POLICY "Users can view own progress"
ON user_progress FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress"
ON user_progress FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress"
ON user_progress FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own progress
CREATE POLICY "Users can delete own progress"
ON user_progress FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ========================================
-- 3. CONVERSATIONS TABLE
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
DROP POLICY IF EXISTS "Service role full access" ON conversations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON conversations;
DROP POLICY IF EXISTS "Enable read access for users" ON conversations;
DROP POLICY IF EXISTS "Enable update for users" ON conversations;
DROP POLICY IF EXISTS "Enable delete for users" ON conversations;

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversations
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own conversations
CREATE POLICY "Users can create own conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations"
ON conversations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own conversations
CREATE POLICY "Users can delete own conversations"
ON conversations FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ========================================
-- 4. MESSAGES TABLE
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can update messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can delete messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Service role full access" ON messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON messages;
DROP POLICY IF EXISTS "Enable read access for users" ON messages;
DROP POLICY IF EXISTS "Enable update for users" ON messages;
DROP POLICY IF EXISTS "Enable delete for users" ON messages;

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in own conversations"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

-- Users can create messages in their conversations
CREATE POLICY "Users can create messages in own conversations"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

-- Users can update messages in their conversations
CREATE POLICY "Users can update messages in own conversations"
ON messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

-- Users can delete messages in their conversations
CREATE POLICY "Users can delete messages in own conversations"
ON messages FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

-- ========================================
-- 5. CHAPTERS TABLE (Public read-only)
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Chapters are publicly readable" ON chapters;
DROP POLICY IF EXISTS "Service role full access" ON chapters;
DROP POLICY IF EXISTS "Enable read access for all users" ON chapters;

-- Enable RLS
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- Everyone can read chapters
CREATE POLICY "Chapters are publicly readable"
ON chapters FOR SELECT
TO anon, authenticated
USING (true);

-- ========================================
-- 6. CATEGORIES TABLE (Public read-only)
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Categories are publicly readable" ON categories;
DROP POLICY IF EXISTS "Service role full access" ON categories;
DROP POLICY IF EXISTS "Enable read access for all users" ON categories;

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read categories
CREATE POLICY "Categories are publicly readable"
ON categories FOR SELECT
TO anon, authenticated
USING (true);

-- ========================================
-- IMPORTANT NOTES:
-- ========================================
-- 1. Service role (used in tests) automatically bypasses RLS
-- 2. Each policy is specific to authenticated users except public tables
-- 3. No recursive policies - we don't check the same table in its own policy
-- 4. Simple auth.uid() = user_id checks for user-owned data
-- 5. Messages use EXISTS subquery to check conversation ownership