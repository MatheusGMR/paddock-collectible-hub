
-- Table to track listing interactions (views, cart adds, buy clicks)
CREATE TABLE public.listing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid,
  event_type text NOT NULL, -- 'view', 'cart_add', 'buy_click', 'share'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast seller queries
CREATE INDEX idx_listing_events_listing ON public.listing_events(listing_id);
CREATE INDEX idx_listing_events_created ON public.listing_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.listing_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (anonymous browsing allowed)
CREATE POLICY "Anyone can insert listing events"
  ON public.listing_events FOR INSERT
  WITH CHECK (true);

-- Sellers can read events for their own listings
CREATE POLICY "Sellers can view events for own listings"
  ON public.listing_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_events.listing_id
        AND l.user_id = auth.uid()
    )
  );

-- DB function to get seller listing analytics
CREATE OR REPLACE FUNCTION public.get_seller_listing_analytics(p_seller_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  IF p_seller_id != auth.uid()::text THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_build_object(
    'summary', (
      SELECT json_build_object(
        'total_views', COUNT(*) FILTER (WHERE le.event_type = 'view'),
        'total_cart_adds', COUNT(*) FILTER (WHERE le.event_type = 'cart_add'),
        'total_buy_clicks', COUNT(*) FILTER (WHERE le.event_type = 'buy_click'),
        'total_shares', COUNT(*) FILTER (WHERE le.event_type = 'share'),
        'unique_visitors', COUNT(DISTINCT le.user_id) FILTER (WHERE le.user_id IS NOT NULL)
      )
      FROM public.listing_events le
      INNER JOIN public.listings l ON l.id = le.listing_id
      WHERE l.user_id = p_seller_id
    ),
    'by_listing', (
      SELECT COALESCE(json_agg(row_to_json(bl)), '[]'::json)
      FROM (
        SELECT
          l.id as listing_id,
          l.title,
          l.image_url,
          l.price,
          l.currency,
          COUNT(*) FILTER (WHERE le.event_type = 'view') as views,
          COUNT(*) FILTER (WHERE le.event_type = 'cart_add') as cart_adds,
          COUNT(*) FILTER (WHERE le.event_type = 'buy_click') as buy_clicks,
          COUNT(*) FILTER (WHERE le.event_type = 'share') as shares,
          COUNT(DISTINCT le.user_id) FILTER (WHERE le.user_id IS NOT NULL) as unique_visitors
        FROM public.listings l
        LEFT JOIN public.listing_events le ON le.listing_id = l.id
        WHERE l.user_id = p_seller_id AND l.status = 'active'
        GROUP BY l.id, l.title, l.image_url, l.price, l.currency
        ORDER BY views DESC
      ) bl
    ),
    'daily', (
      SELECT COALESCE(json_agg(row_to_json(d)), '[]'::json)
      FROM (
        SELECT
          DATE_TRUNC('day', le.created_at)::date as date,
          COUNT(*) FILTER (WHERE le.event_type = 'view') as views,
          COUNT(*) FILTER (WHERE le.event_type = 'cart_add') as cart_adds,
          COUNT(*) FILTER (WHERE le.event_type = 'buy_click') as buy_clicks
        FROM public.listing_events le
        INNER JOIN public.listings l ON l.id = le.listing_id
        WHERE l.user_id = p_seller_id
          AND le.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', le.created_at)
        ORDER BY date DESC
      ) d
    )
  ) INTO result;

  RETURN result;
END;
$$;
