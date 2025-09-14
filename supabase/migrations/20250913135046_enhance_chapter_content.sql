-- Add enhanced fields for better chapter content structure
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS author VARCHAR(255);
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS key_takeaways TEXT[];
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS podcast_header VARCHAR(255);
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS video_header VARCHAR(255);

-- Update the chapters table with some sample enhanced data if desired
-- (This can be populated through the admin interface later)