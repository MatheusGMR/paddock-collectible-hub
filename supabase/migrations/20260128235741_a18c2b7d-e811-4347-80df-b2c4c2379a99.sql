-- Add price index columns to items table
ALTER TABLE public.items
ADD COLUMN price_index integer,
ADD COLUMN rarity_tier text,
ADD COLUMN index_breakdown jsonb;

-- Add check constraint for price_index range
ALTER TABLE public.items
ADD CONSTRAINT items_price_index_range CHECK (price_index IS NULL OR (price_index >= 1 AND price_index <= 100));

-- Add check constraint for rarity_tier values
ALTER TABLE public.items
ADD CONSTRAINT items_rarity_tier_values CHECK (rarity_tier IS NULL OR rarity_tier IN ('common', 'uncommon', 'rare', 'super_rare', 'ultra_rare'));

-- Create index for efficient ranking queries
CREATE INDEX idx_items_price_index ON public.items(price_index DESC NULLS LAST);
CREATE INDEX idx_items_rarity_tier ON public.items(rarity_tier);

-- Add comment for documentation
COMMENT ON COLUMN public.items.price_index IS 'Value index from 1-100 based on rarity, condition, and other factors';
COMMENT ON COLUMN public.items.rarity_tier IS 'Rarity classification: common, uncommon, rare, super_rare, ultra_rare';
COMMENT ON COLUMN public.items.index_breakdown IS 'Detailed breakdown of index calculation by criteria';