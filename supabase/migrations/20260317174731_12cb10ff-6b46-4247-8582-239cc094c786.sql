
-- Function to get refined market value combining AI estimates + user crowdsourced prices
CREATE OR REPLACE FUNCTION public.get_refined_market_value(p_item_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
  v_ai_min NUMERIC;
  v_ai_max NUMERIC;
  v_user_paid_avg NUMERIC;
  v_user_paid_count INTEGER;
  v_user_guess_avg NUMERIC;
  v_user_guess_count INTEGER;
  v_refined_min NUMERIC;
  v_refined_max NUMERIC;
  v_total_contributors INTEGER;
  v_confidence TEXT;
BEGIN
  -- Get AI estimates from items table
  SELECT estimated_value_min, estimated_value_max
  INTO v_ai_min, v_ai_max
  FROM public.items
  WHERE id = p_item_id;

  -- Get average of user "paid" prices (highest weight - real transactions)
  SELECT AVG(price_brl), COUNT(*)
  INTO v_user_paid_avg, v_user_paid_count
  FROM public.price_estimates
  WHERE item_id = p_item_id AND source = 'user_paid' AND price_brl IS NOT NULL;

  -- Get average of user "guess" prices
  SELECT AVG(price_brl), COUNT(*)
  INTO v_user_guess_avg, v_user_guess_count
  FROM public.price_estimates
  WHERE item_id = p_item_id AND source = 'user_guess' AND price_brl IS NOT NULL;

  v_total_contributors := COALESCE(v_user_paid_count, 0) + COALESCE(v_user_guess_count, 0);

  -- Weighted refinement logic:
  -- AI base = weight 1.0
  -- Each user_paid = weight 0.5 (capped at total weight 2.0)
  -- Each user_guess = weight 0.2 (capped at total weight 1.0)
  IF v_ai_min IS NOT NULL AND v_ai_max IS NOT NULL THEN
    DECLARE
      v_ai_mid NUMERIC := (v_ai_min + v_ai_max) / 2.0;
      v_ai_weight NUMERIC := 1.0;
      v_paid_weight NUMERIC := LEAST(COALESCE(v_user_paid_count, 0) * 0.5, 2.0);
      v_guess_weight NUMERIC := LEAST(COALESCE(v_user_guess_count, 0) * 0.2, 1.0);
      v_total_weight NUMERIC;
      v_weighted_mid NUMERIC;
      v_range_factor NUMERIC;
    BEGIN
      v_total_weight := v_ai_weight + v_paid_weight + v_guess_weight;
      
      v_weighted_mid := (
        v_ai_mid * v_ai_weight
        + COALESCE(v_user_paid_avg, 0) * v_paid_weight
        + COALESCE(v_user_guess_avg, 0) * v_guess_weight
      ) / v_total_weight;

      -- Range narrows as more data comes in (min 15% spread, max = AI original spread)
      v_range_factor := GREATEST(0.15, 1.0 / (1.0 + v_total_contributors * 0.3));
      
      v_refined_min := ROUND(v_weighted_mid * (1.0 - v_range_factor / 2.0));
      v_refined_max := ROUND(v_weighted_mid * (1.0 + v_range_factor / 2.0));
      
      -- Ensure min >= 0
      v_refined_min := GREATEST(v_refined_min, 0);
    END;
  ELSIF v_user_paid_count > 0 THEN
    -- No AI estimate, use paid prices only
    v_refined_min := ROUND(v_user_paid_avg * 0.85);
    v_refined_max := ROUND(v_user_paid_avg * 1.15);
  ELSIF v_user_guess_count > 0 THEN
    v_refined_min := ROUND(v_user_guess_avg * 0.75);
    v_refined_max := ROUND(v_user_guess_avg * 1.25);
  ELSE
    -- No data at all
    v_refined_min := v_ai_min;
    v_refined_max := v_ai_max;
  END IF;

  -- Confidence based on data sources
  IF v_user_paid_count >= 3 THEN
    v_confidence := 'high';
  ELSIF v_user_paid_count >= 1 OR v_user_guess_count >= 3 THEN
    v_confidence := 'medium';
  ELSIF v_ai_min IS NOT NULL THEN
    v_confidence := 'low';
  ELSE
    v_confidence := 'low';
  END IF;

  SELECT json_build_object(
    'refined_min', v_refined_min,
    'refined_max', v_refined_max,
    'ai_min', v_ai_min,
    'ai_max', v_ai_max,
    'user_paid_avg', v_user_paid_avg,
    'user_paid_count', COALESCE(v_user_paid_count, 0),
    'user_guess_avg', v_user_guess_avg,
    'user_guess_count', COALESCE(v_user_guess_count, 0),
    'total_contributors', v_total_contributors,
    'confidence', v_confidence
  ) INTO result;

  RETURN result;
END;
$$;
