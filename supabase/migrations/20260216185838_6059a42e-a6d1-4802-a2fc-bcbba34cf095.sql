
-- Add estimated value columns to items
ALTER TABLE public.items 
ADD COLUMN estimated_value_min NUMERIC,
ADD COLUMN estimated_value_max NUMERIC;

-- Create price_estimates table
CREATE TABLE public.price_estimates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'user_guess',
  price_min_brl NUMERIC,
  price_max_brl NUMERIC,
  price_brl NUMERIC,
  currency TEXT NOT NULL DEFAULT 'BRL',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_estimates ENABLE ROW LEVEL SECURITY;

-- SELECT: anyone can see (public market data)
CREATE POLICY "Anyone can view price estimates"
ON public.price_estimates FOR SELECT
USING (true);

-- INSERT: authenticated users
CREATE POLICY "Authenticated users can insert price estimates"
ON public.price_estimates FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: own estimates only
CREATE POLICY "Users can update own price estimates"
ON public.price_estimates FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE: own estimates only
CREATE POLICY "Users can delete own price estimates"
ON public.price_estimates FOR DELETE
USING (auth.uid() = user_id);

-- Index for quick lookups
CREATE INDEX idx_price_estimates_item_id ON public.price_estimates(item_id);
CREATE INDEX idx_price_estimates_user_id ON public.price_estimates(user_id);
