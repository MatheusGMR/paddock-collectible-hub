-- 1. Criar tabela para armazenar assinaturas push
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  topics text[] DEFAULT ARRAY['launches'],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS
CREATE POLICY "Users can manage own push subscriptions"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Índice para busca por tópico
CREATE INDEX idx_push_subscriptions_topics ON public.push_subscriptions USING GIN(topics);

-- 5. Adicionar coluna de notificações na tabela de preferências (se não existir)
ALTER TABLE public.user_news_preferences 
ADD COLUMN IF NOT EXISTS push_enabled boolean DEFAULT false;

-- 6. Adicionar coluna de tags de lançamento nos artigos
ALTER TABLE public.news_articles
ADD COLUMN IF NOT EXISTS is_launch boolean DEFAULT false;