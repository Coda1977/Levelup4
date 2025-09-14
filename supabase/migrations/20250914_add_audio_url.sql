-- Add audio_url field to chapters table
ALTER TABLE chapters 
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS audio_voice TEXT DEFAULT 'nova',
ADD COLUMN IF NOT EXISTS audio_generated_at TIMESTAMP WITH TIME ZONE;