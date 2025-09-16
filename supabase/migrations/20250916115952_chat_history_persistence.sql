-- Chat History Persistence Schema for LevelUp4
-- This migration creates the core tables for storing chat conversations and messages

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
-- Stores conversation metadata per user
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    selected_chapters JSONB DEFAULT '[]'::jsonb,
    conversation_metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================
-- MESSAGES TABLE
-- ============================================
-- Stores individual messages within conversations
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    followups JSONB DEFAULT '[]'::jsonb,
    relevant_chapters JSONB DEFAULT '[]'::jsonb,
    message_metadata JSONB DEFAULT '{}'::jsonb,
    is_complete BOOLEAN DEFAULT TRUE,
    token_count INTEGER
);

-- ============================================
-- CHAT PREFERENCES TABLE
-- ============================================
-- Stores user-specific chat preferences
CREATE TABLE IF NOT EXISTS public.chat_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
    font_size TEXT DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
    auto_save BOOLEAN DEFAULT TRUE,
    show_timestamps BOOLEAN DEFAULT TRUE,
    preferences_metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Index for faster conversation lookups by user
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);

-- Index for faster conversation lookups by timestamps
CREATE INDEX idx_conversations_updated_at ON public.conversations(updated_at DESC);

-- Composite index for archived/starred filtering
CREATE INDEX idx_conversations_filters ON public.conversations(user_id, is_archived, is_starred);

-- Index for faster message lookups by conversation
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);

-- Index for message timestamps for pagination
CREATE INDEX idx_messages_timestamp ON public.messages(conversation_id, timestamp DESC);

-- Index for chat preferences lookups
CREATE INDEX idx_chat_preferences_user_id ON public.chat_preferences(user_id);

-- ============================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ============================================

-- Function to update conversation.updated_at when messages are added/modified
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating conversation timestamp on new messages
CREATE TRIGGER update_conversation_on_message
    AFTER INSERT OR UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- Function to update chat_preferences.updated_at on changes
CREATE OR REPLACE FUNCTION update_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating preferences timestamp
CREATE TRIGGER update_preferences_timestamp
    BEFORE UPDATE ON public.chat_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_preferences_timestamp();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CONVERSATIONS RLS POLICIES
-- ============================================

-- Users can view only their own conversations
CREATE POLICY "Users can view own conversations"
    ON public.conversations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own conversations
CREATE POLICY "Users can create own conversations"
    ON public.conversations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update only their own conversations
CREATE POLICY "Users can update own conversations"
    ON public.conversations
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete only their own conversations
CREATE POLICY "Users can delete own conversations"
    ON public.conversations
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- MESSAGES RLS POLICIES
-- ============================================

-- Users can view messages from their own conversations
-- Using EXISTS to avoid recursion issues
CREATE POLICY "Users can view messages from own conversations"
    ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND c.user_id = auth.uid()
        )
    );

-- Users can create messages in their own conversations
CREATE POLICY "Users can create messages in own conversations"
    ON public.messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND c.user_id = auth.uid()
        )
    );

-- Users can update messages in their own conversations
CREATE POLICY "Users can update messages in own conversations"
    ON public.messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND c.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND c.user_id = auth.uid()
        )
    );

-- Users can delete messages from their own conversations
CREATE POLICY "Users can delete messages from own conversations"
    ON public.messages
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND c.user_id = auth.uid()
        )
    );

-- ============================================
-- CHAT PREFERENCES RLS POLICIES
-- ============================================

-- Users can view only their own preferences
CREATE POLICY "Users can view own preferences"
    ON public.chat_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own preferences
CREATE POLICY "Users can create own preferences"
    ON public.chat_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update only their own preferences
CREATE POLICY "Users can update own preferences"
    ON public.chat_preferences
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete only their own preferences
CREATE POLICY "Users can delete own preferences"
    ON public.chat_preferences
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- GRANT NECESSARY PERMISSIONS
-- ============================================

-- Grant permissions to authenticated users
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.chat_preferences TO authenticated;

-- Grant usage on sequences (for auto-generated IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE public.conversations IS 'Stores chat conversation metadata for each user';
COMMENT ON TABLE public.messages IS 'Stores individual messages within conversations';
COMMENT ON TABLE public.chat_preferences IS 'Stores user-specific chat interface preferences';

COMMENT ON COLUMN public.conversations.selected_chapters IS 'JSONB array of chapter IDs selected for this conversation context';
COMMENT ON COLUMN public.messages.followups IS 'JSONB array of suggested follow-up questions';
COMMENT ON COLUMN public.messages.relevant_chapters IS 'JSONB array of chapter IDs relevant to this message';
COMMENT ON COLUMN public.messages.token_count IS 'Optional token count for tracking usage';