
CREATE OR REPLACE FUNCTION public.get_seller_inventory(p_seller_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        WHERE l.user_id = p_seller_id::uuid AND l.status = 'active'
        ORDER BY l.created_at DESC
      ) a
    ),
    'sold', (
      SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
      FROM (
        SELECT l.id, l.title, l.price, l.currency, l.image_url, l.description, l.created_at, l.status,
               sa.id as sale_id, sa.buyer_id, sa.created_at as sold_at, sa.sale_price, sa.seller_net,
               sa.shipping_status
        FROM public.listings l
        LEFT JOIN public.sales sa ON sa.listing_id = l.id
        WHERE l.user_id = p_seller_id::uuid AND l.status = 'sold'
        ORDER BY sa.created_at DESC
      ) s
    ),
    'total_active', (SELECT COUNT(*) FROM public.listings WHERE user_id = p_seller_id::uuid AND status = 'active'),
    'total_sold', (SELECT COUNT(*) FROM public.listings WHERE user_id = p_seller_id::uuid AND status = 'sold'),
    'total_value', (SELECT COALESCE(SUM(price), 0) FROM public.listings WHERE user_id = p_seller_id::uuid AND status = 'active')
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_seller_customers(p_seller_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    LEFT JOIN public.profiles p ON p.user_id = s.buyer_id::uuid
    WHERE s.seller_id = p_seller_id
    GROUP BY s.buyer_id, p.username, p.avatar_url, p.city
    ORDER BY total_spent DESC
  ) c;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_seller_listing_analytics(p_seller_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      WHERE l.user_id = p_seller_id::uuid
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
        WHERE l.user_id = p_seller_id::uuid AND l.status = 'active'
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
        WHERE l.user_id = p_seller_id::uuid
          AND le.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', le.created_at)
        ORDER BY date DESC
      ) d
    )
  ) INTO result;

  RETURN result;
END;
$function$;
