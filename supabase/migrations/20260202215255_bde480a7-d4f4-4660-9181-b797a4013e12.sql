-- Add music_selection_reason column to items table
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS music_selection_reason TEXT;