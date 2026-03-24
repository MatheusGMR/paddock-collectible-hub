CREATE OR REPLACE FUNCTION public.get_seller_receivables(p_seller_id text)
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
    'total_sales', (
      SELECT COUNT(*) FROM public.sales WHERE seller_id = p_seller_id AND status IN ('completed', 'paid_out')
    ),
    'total_revenue', (
      SELECT COALESCE(SUM(sale_price), 0) FROM public.sales WHERE seller_id = p_seller_id AND status IN ('completed', 'paid_out')
    ),
    'total_fees', (
      SELECT COALESCE(SUM(platform_fee_total), 0) FROM public.sales WHERE seller_id = p_seller_id AND status IN ('completed', 'paid_out')
    ),
    'total_net', (
      SELECT COALESCE(SUM(seller_net), 0) FROM public.sales WHERE seller_id = p_seller_id AND status IN ('completed', 'paid_out')
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
        WHERE s.seller_id = p_seller_id AND s.status IN ('completed', 'paid_out')
        ORDER BY s.created_at DESC
        LIMIT 50
      ) rs
    )
  ) INTO result;

  RETURN result;
END;
$function$;