
-- Add is_seller flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_seller BOOLEAN NOT NULL DEFAULT false;

-- Create seller_details table for account/address info
CREATE TABLE public.seller_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  business_name TEXT,
  document_number TEXT,
  phone TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  address_country TEXT DEFAULT 'BR',
  bank_name TEXT,
  bank_agency TEXT,
  bank_account TEXT,
  bank_account_type TEXT DEFAULT 'checking',
  pix_key TEXT,
  stripe_account_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own details" ON public.seller_details
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Sellers can insert own details" ON public.seller_details
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Sellers can update own details" ON public.seller_details
  FOR UPDATE USING (user_id = auth.uid()::text);

-- Trigger for updated_at
CREATE TRIGGER update_seller_details_updated_at
  BEFORE UPDATE ON public.seller_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function: get seller customers with purchase history
CREATE OR REPLACE FUNCTION public.get_seller_customers(p_seller_id text)
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

  SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json) INTO result
  FROM (
    SELECT
      s.buyer_id,
      p.username as buyer_username,
      p.avatar_url as buyer_avatar,
      p.city as buyer_city,
      COUNT(*) as total_purchases,
      SUM(s.sale_price) as total_spent,
      MAX(s.created_at) as last_purchase_at,
      (
        SELECT COALESCE(json_agg(row_to_json(purchases)), '[]'::json)
        FROM (
          SELECT
            s2.id,
            s2.sale_price,
            s2.currency,
            s2.created_at,
            s2.status,
            l.title as listing_title,
            l.image_url as listing_image
          FROM public.sales s2
          LEFT JOIN public.listings l ON l.id = s2.listing_id
          WHERE s2.seller_id = p_seller_id AND s2.buyer_id = s.buyer_id
          ORDER BY s2.created_at DESC
          LIMIT 20
        ) purchases
      ) as purchases
    FROM public.sales s
    LEFT JOIN public.profiles p ON p.user_id = s.buyer_id
    WHERE s.seller_id = p_seller_id
    GROUP BY s.buyer_id, p.username, p.avatar_url, p.city
    ORDER BY total_spent DESC
  ) c;

  RETURN result;
END;
$$;

-- Function: get seller inventory (listings with status)
CREATE OR REPLACE FUNCTION public.get_seller_inventory(p_seller_id text)
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
    'active', (
      SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json)
      FROM (
        SELECT l.id, l.title, l.price, l.currency, l.image_url, l.description, l.source, l.source_name, l.created_at, l.status
        FROM public.listings l
        WHERE l.user_id = p_seller_id AND l.status = 'active'
        ORDER BY l.created_at DESC
      ) a
    ),
    'sold', (
      SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
      FROM (
        SELECT l.id, l.title, l.price, l.currency, l.image_url, l.description, l.created_at, l.status,
               sa.buyer_id, sa.created_at as sold_at, sa.sale_price, sa.seller_net
        FROM public.listings l
        LEFT JOIN public.sales sa ON sa.listing_id = l.id
        WHERE l.user_id = p_seller_id AND l.status = 'sold'
        ORDER BY sa.created_at DESC
      ) s
    ),
    'total_active', (SELECT COUNT(*) FROM public.listings WHERE user_id = p_seller_id AND status = 'active'),
    'total_sold', (SELECT COUNT(*) FROM public.listings WHERE user_id = p_seller_id AND status = 'sold'),
    'total_value', (SELECT COALESCE(SUM(price), 0) FROM public.listings WHERE user_id = p_seller_id AND status = 'active')
  ) INTO result;

  RETURN result;
END;
$$;
