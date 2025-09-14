-- Add new fields to chapters table for redesigned interface
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'lesson';
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS chapter_number INTEGER;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS reading_time INTEGER; -- in minutes
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS podcast_title VARCHAR(255);
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS podcast_url VARCHAR(500);
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS video_title VARCHAR(255);
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS video_url VARCHAR(500);
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS try_this_week TEXT;

-- Update existing chapters to have chapter numbers based on their sort_order
UPDATE public.chapters 
SET chapter_number = sort_order 
WHERE chapter_number IS NULL;

-- Update content_type for existing chapters (all are lessons by default)
UPDATE public.chapters 
SET content_type = 'lesson' 
WHERE content_type IS NULL;