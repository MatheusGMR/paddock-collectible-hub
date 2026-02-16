
-- Sales tracking table with Paddock fee calculation
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  seller_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  sale_price NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  platform_fee_fixed NUMERIC(12, 2) NOT NULL DEFAULT 1.99,
  platform_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 4.99,
  platform_fee_total NUMERIC(12, 2) NOT NULL,
  seller_net NUMERIC(12, 2) NOT NULL,
  stripe_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Sellers can view their own sales
CREATE POLICY "Sellers view own sales"
  ON public.sales FOR SELECT
  USING (seller_id = auth.uid()::text);

-- Buyers can view their own purchases
CREATE POLICY "Buyers view own purchases"
  ON public.sales FOR SELECT
  USING (buyer_id = auth.uid()::text);

-- Only backend (service role) inserts sales
CREATE POLICY "Service role inserts sales"
  ON public.sales FOR INSERT
  WITH CHECK (true);

-- Index for fast seller lookups
CREATE INDEX idx_sales_seller_id ON public.sales(seller_id);
CREATE INDEX idx_sales_buyer_id ON public.sales(buyer_id);
CREATE INDEX idx_sales_status ON public.sales(status);

-- DB function to get seller receivables summary
CREATE OR REPLACE FUNCTION public.get_seller_receivables(p_seller_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  -- Only allow seller to view their own receivables
  IF p_seller_id != auth.uid()::text THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_build_object(
    'total_sales', (
      SELECT COUNT(*) FROM public.sales WHERE seller_id = p_seller_id
    ),
    'total_revenue', (
      SELECT COALESCE(SUM(sale_price), 0) FROM public.sales WHERE seller_id = p_seller_id
    ),
    'total_fees', (
      SELECT COALESCE(SUM(platform_fee_total), 0) FROM public.sales WHERE seller_id = p_seller_id
    ),
    'total_net', (
      SELECT COALESCE(SUM(seller_net), 0) FROM public.sales WHERE seller_id = p_seller_id
    ),
    'pending_amount', (
      SELECT COALESCE(SUM(seller_net), 0) FROM public.sales WHERE seller_id = p_seller_id AND status = 'completed'
    ),
    'paid_out_amount', (
      SELECT COALESCE(SUM(seller_net), 0) FROM public.sales WHERE seller_id = p_seller_id AND status = 'paid_out'
    ),
    'recent_sales', (
      SELECT COALESCE(json_agg(row_to_json(rs)), '[]'::json)
      FROM (
        SELECT 
          s.id,
          s.sale_price,
          s.currency,
          s.platform_fee_total,
          s.seller_net,
          s.status,
          s.created_at,
          s.paid_out_at,
          l.title as listing_title,
          l.image_url as listing_image
        FROM public.sales s
        LEFT JOIN public.listings l ON l.id = s.listing_id
        WHERE s.seller_id = p_seller_id
        ORDER BY s.created_at DESC
        LIMIT 50
      ) rs
    )
  ) INTO result;

  RETURN result;
END;
$$;
