-- Add collectible_color column to items table for duplicate detection
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS collectible_color text;