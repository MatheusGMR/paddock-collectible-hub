CREATE TABLE public.push_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  image_url text,
  url text NOT NULL DEFAULT '/',
  audience jsonb NOT NULL DEFAULT '{"type":"all"}'::jsonb,
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'draft',
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  click_count integer NOT NULL DEFAULT 0,
  target_count integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_campaigns TO authenticated;
GRANT ALL ON public.push_campaigns TO service_role;
ALTER TABLE public.push_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage campaigns" ON public.push_campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_push_campaigns_updated BEFORE UPDATE ON public.push_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.push_triggers (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  title text NOT NULL,
  body text NOT NULL,
  url text NOT NULL DEFAULT '/',
  sent_count integer NOT NULL DEFAULT 0,
  click_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_triggers TO authenticated;
GRANT ALL ON public.push_triggers TO service_role;
ALTER TABLE public.push_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage triggers" ON public.push_triggers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_push_triggers_updated BEFORE UPDATE ON public.push_triggers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.push_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  max_per_day integer NOT NULL DEFAULT 3,
  quiet_start integer NOT NULL DEFAULT 22,
  quiet_end integer NOT NULL DEFAULT 8,
  last_event_scan timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.push_settings TO authenticated;
GRANT ALL ON public.push_settings TO service_role;
ALTER TABLE public.push_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage push settings" ON public.push_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.push_settings (id) VALUES (1);

CREATE TABLE public.push_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  campaign_id uuid REFERENCES public.push_campaigns(id) ON DELETE CASCADE,
  trigger_key text,
  ref_key text,
  status text NOT NULL DEFAULT 'sent',
  clicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_deliveries_user ON public.push_deliveries(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_push_deliveries_ref ON public.push_deliveries(trigger_key, ref_key) WHERE ref_key IS NOT NULL;
GRANT SELECT ON public.push_deliveries TO authenticated;
GRANT ALL ON public.push_deliveries TO service_role;
ALTER TABLE public.push_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read deliveries" ON public.push_deliveries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.user_moderation (
  user_id uuid PRIMARY KEY,
  blocked boolean NOT NULL DEFAULT false,
  reason text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_moderation TO authenticated;
GRANT ALL ON public.user_moderation TO service_role;
ALTER TABLE public.user_moderation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage moderation" ON public.user_moderation FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users see own moderation" ON public.user_moderation FOR SELECT TO authenticated
  USING (user_id = auth.uid());

INSERT INTO public.push_triggers (key,label,description,title,body,url,enabled) VALUES
 ('welcome','Boas-vindas','Logo após o cadastro','Bem-vindo ao Paddock!','Escaneie seu primeiro carrinho e comece sua coleção.','/scanner',true),
 ('trial_ending','Teste terminando','2 dias antes do fim do teste Premium','Seu teste Premium termina em 2 dias','Continue com acesso completo à sua coleção.','/profile',true),
 ('trial_ended','Teste terminou','No dia em que o teste acaba','Seu teste Premium terminou','Assine para continuar com todos os recursos.','/profile',true),
 ('inactive_7','Inativo 7 dias','Sem abrir o app há 7 dias','Sua coleção sente sua falta','Veja as novidades da comunidade.','/',true),
 ('inactive_14','Inativo 14 dias','Sem abrir o app há 14 dias','Novos carrinhos no Mercado','Confira o que chegou nas lojas.','/mercado',false),
 ('inactive_30','Inativo 30 dias','Sem abrir o app há 30 dias','Faz tempo!','Que tal escanear um novo carrinho hoje?','/scanner',false),
 ('challenge_near','Desafio quase lá','Faltam 5 carrinhos para os 50','Faltam só 5 carrinhos!','Complete o desafio e ganhe 1 mês grátis.','/scanner',true),
 ('challenge_done','Desafio concluído','Chegou aos 50 carrinhos','Desafio concluído!','Você ganhou 1 mês grátis de Paddock Premium.','/profile',true),
 ('like','Nova curtida','Alguém curtiu seu post','Nova curtida','{actor} curtiu seu carrinho.','/notifications',true),
 ('comment','Novo comentário','Alguém comentou','Novo comentário','{actor} comentou no seu carrinho.','/notifications',true),
 ('follow','Novo seguidor','Alguém começou a seguir','Novo seguidor','{actor} começou a seguir você.','/notifications',true),
 ('message','Nova mensagem','Mensagem direta recebida','Nova mensagem','{actor} enviou uma mensagem.','/',true),
 ('sale','Venda realizada','Para o lojista, ao vender','Você vendeu!','{listing} foi vendido. Prepare o envio.','/seller',true),
 ('shipped','Pedido enviado','Para o comprador','Seu pedido foi enviado','{listing} está a caminho.','/profile',true),
 ('new_listing','Novo anúncio de loja seguida','Lojista seguido publicou','Novidade na loja','{actor} anunciou {listing}.','/mercado',false);

CREATE OR REPLACE FUNCTION public.mark_push_clicked(p_delivery_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d record;
BEGIN
  UPDATE push_deliveries SET clicked_at = now() WHERE id = p_delivery_id AND clicked_at IS NULL RETURNING * INTO d;
  IF d.id IS NULL THEN RETURN; END IF;
  IF d.campaign_id IS NOT NULL THEN UPDATE push_campaigns SET click_count = click_count + 1 WHERE id = d.campaign_id; END IF;
  IF d.trigger_key IS NOT NULL THEN UPDATE push_triggers SET click_count = click_count + 1 WHERE key = d.trigger_key; END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.mark_push_clicked(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_kpis(days_back integer DEFAULT 30)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s timestamptz := now() - (days_back || ' days')::interval;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN json_build_object(
    'dau', (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at >= now()-interval '1 day'),
    'wau', (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at >= now()-interval '7 days'),
    'mau', (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at >= now()-interval '30 days'),
    'new_users', (SELECT COUNT(*) FROM profiles WHERE created_at >= s),
    'scans', (SELECT COUNT(*) FROM user_collection WHERE created_at >= s),
    'posts', (SELECT COUNT(*) FROM posts WHERE created_at >= s),
    'sales_count', (SELECT COUNT(*) FROM sales WHERE created_at >= s AND status IN ('completed','paid_out')),
    'gmv', (SELECT COALESCE(SUM(sale_price),0) FROM sales WHERE created_at >= s AND status IN ('completed','paid_out')),
    'fees', (SELECT COALESCE(SUM(platform_fee_total),0) FROM sales WHERE created_at >= s AND status IN ('completed','paid_out')),
    'subs_trial', (SELECT COUNT(*) FROM user_subscriptions WHERE status='trial' AND trial_ends_at > now()),
    'subs_active', (SELECT COUNT(*) FROM user_subscriptions WHERE status='active'),
    'subs_canceled', (SELECT COUNT(*) FROM user_subscriptions WHERE status IN ('canceled','expired')),
    'push_subscribers', (SELECT COUNT(DISTINCT user_id) FROM push_subscriptions),
    'retention_7d', (
      SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM analytics_events e WHERE e.user_id = p.user_id AND e.created_at >= p.created_at + interval '7 days'))
        / NULLIF(COUNT(*),0), 1)
      FROM profiles p WHERE p.created_at BETWEEN s AND now()-interval '7 days')
  );
END $$;

CREATE OR REPLACE FUNCTION public.get_admin_marketplace_stats()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN json_build_object(
    'active_listings', (SELECT COUNT(*) FROM listings WHERE status='active'),
    'pending_shipments', (SELECT COUNT(*) FROM sales WHERE status IN ('completed','paid_out') AND shipping_status NOT IN ('shipped','delivered')),
    'listings', (SELECT COALESCE(json_agg(row_to_json(l)),'[]') FROM (
      SELECT l.id, l.title, l.price, l.image_url, l.status, l.created_at, p.username
      FROM listings l LEFT JOIN profiles p ON p.user_id = l.user_id
      WHERE l.source = 'paddock' OR l.user_id IS NOT NULL
      ORDER BY l.created_at DESC LIMIT 50) l),
    'sales', (SELECT COALESCE(json_agg(row_to_json(x)),'[]') FROM (
      SELECT s.id, s.sale_price, s.platform_fee_total, s.status, s.shipping_status, s.created_at, l.title
      FROM sales s LEFT JOIN listings l ON l.id = s.listing_id ORDER BY s.created_at DESC LIMIT 50) x)
  );
END $$;

CREATE OR REPLACE FUNCTION public.get_push_audience(p_audience jsonb)
RETURNS TABLE(user_id uuid) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE t text := COALESCE(p_audience->>'type','all');
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY
  SELECT DISTINCT ps.user_id FROM push_subscriptions ps
  LEFT JOIN profiles p ON p.user_id = ps.user_id
  LEFT JOIN user_subscriptions us ON us.user_id = ps.user_id
  WHERE ps.user_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM user_moderation m WHERE m.user_id = ps.user_id AND m.blocked)
    AND CASE t
      WHEN 'collectors' THEN COALESCE(p.is_seller,false) = false
      WHEN 'sellers' THEN COALESCE(p.is_seller,false) = true
      WHEN 'premium' THEN us.status = 'active'
      WHEN 'trial' THEN us.status = 'trial' AND us.trial_ends_at > now()
      WHEN 'inactive' THEN NOT EXISTS (SELECT 1 FROM analytics_events e WHERE e.user_id = ps.user_id
          AND e.created_at >= now() - (COALESCE((p_audience->>'days')::int,7) || ' days')::interval)
      WHEN 'city' THEN p.city ILIKE COALESCE(p_audience->>'city','')
      WHEN 'topic' THEN ps.topics @> ARRAY[p_audience->>'topic']
      WHEN 'users' THEN ps.user_id::text IN (SELECT jsonb_array_elements_text(p_audience->'user_ids'))
      ELSE true END;
END $$;