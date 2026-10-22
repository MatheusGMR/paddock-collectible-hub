CREATE OR REPLACE FUNCTION public.account_deletion_files(p_user_id uuid)
RETURNS TABLE(bucket_id text, name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT o.bucket_id, o.name FROM storage.objects o WHERE o.owner = p_user_id OR o.owner_id = p_user_id::text OR split_part(o.name, '/', 1) = p_user_id::text; $$;
REVOKE ALL ON FUNCTION public.account_deletion_files(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_deletion_files(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.delete_account_data(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM sales WHERE seller_id = p_user_id::text AND status IN ('completed','paid_out','paid') AND COALESCE(shipping_status,'') NOT IN ('delivered','completed','canceled','cancelled')) THEN
    RAISE EXCEPTION 'Você tem pedidos em andamento. Conclua ou cancele antes de excluir a conta.';
  END IF;
  DELETE FROM notifications WHERE user_id = p_user_id OR actor_id = p_user_id;
  DELETE FROM post_likes WHERE user_id = p_user_id;
  DELETE FROM post_comments WHERE user_id = p_user_id;
  DELETE FROM posts WHERE user_id = p_user_id;
  DELETE FROM conversations c WHERE EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = c.id AND cp.user_id = p_user_id) AND (SELECT count(*) FROM conversation_participants cp WHERE cp.conversation_id = c.id) <= 2;
  DELETE FROM messages WHERE sender_id = p_user_id;
  DELETE FROM conversation_participants WHERE user_id = p_user_id;
  DELETE FROM cart_items WHERE user_id = p_user_id::text;
  DELETE FROM listing_events WHERE user_id = p_user_id;
  DELETE FROM sales WHERE seller_id = p_user_id::text OR buyer_id = p_user_id::text;
  DELETE FROM listings WHERE user_id = p_user_id;
  DELETE FROM price_estimates WHERE user_id = p_user_id;
  DELETE FROM scan_feedback WHERE user_id = p_user_id;
  DELETE FROM user_collection WHERE user_id = p_user_id;
  DELETE FROM follows WHERE follower_id = p_user_id OR following_id = p_user_id;
  DELETE FROM ai_usage_logs WHERE user_id = p_user_id;
  DELETE FROM analytics_events WHERE user_id = p_user_id;
  DELETE FROM scanner_error_logs WHERE user_id = p_user_id;
  DELETE FROM ml_ab_results WHERE user_id = p_user_id;
  DELETE FROM push_deliveries WHERE user_id = p_user_id;
  DELETE FROM push_subscriptions WHERE user_id = p_user_id;
  DELETE FROM push_campaigns WHERE created_by = p_user_id;
  DELETE FROM user_moderation WHERE user_id = p_user_id;
  DELETE FROM user_news_preferences WHERE user_id = p_user_id;
  DELETE FROM user_subscriptions WHERE user_id = p_user_id;
  DELETE FROM seller_details WHERE user_id = p_user_id::text;
  DELETE FROM user_roles WHERE user_id = p_user_id;
  DELETE FROM profiles WHERE user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_account_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_account_data(uuid) TO service_role;