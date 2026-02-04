-- Add is_pinned column to user_collection for pinning posts
ALTER TABLE public.user_collection
ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT false;

-- Add pinned_at to track when the item was pinned (for ordering)
ALTER TABLE public.user_collection
ADD COLUMN pinned_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient pinned queries
CREATE INDEX idx_user_collection_pinned ON public.user_collection (user_id, is_pinned, pinned_at DESC NULLS LAST);