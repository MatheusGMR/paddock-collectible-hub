
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
        WHERE l.user_id = p_seller_id AND l.status = 'active'
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
$function$;
