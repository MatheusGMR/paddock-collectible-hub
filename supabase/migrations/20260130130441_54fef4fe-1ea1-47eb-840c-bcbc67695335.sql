-- 1. Criar tabela de artigos de notícias
CREATE TABLE public.news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  content text,
  image_url text,
  source_url text NOT NULL UNIQUE,
  source_name text NOT NULL,
  source_logo text,
  category text NOT NULL,
  subcategory text,
  published_at timestamptz,
  fetched_at timestamptz DEFAULT now(),
  language text DEFAULT 'pt',
  tags text[],
  is_featured boolean DEFAULT false,
  view_count integer DEFAULT 0
);

-- 2. Criar tabela de preferências do usuário
CREATE TABLE public.user_news_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  categories text[] DEFAULT ARRAY['collectibles', 'motorsport'],
  subcategories text[],
  sources text[],
  language text DEFAULT 'pt',
  notifications_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. Criar tabela de fontes de notícias
CREATE TABLE public.news_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  url text NOT NULL,
  rss_url text,
  logo_url text,
  category text NOT NULL,
  language text DEFAULT 'pt',
  is_active boolean DEFAULT true,
  fetch_method text DEFAULT 'rss',
  last_fetched_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 4. Inserir fontes iniciais
INSERT INTO public.news_sources (name, code, url, rss_url, category, language, fetch_method) VALUES
  ('Motorsport.com', 'motorsport', 'https://motorsport.com', 'https://www.motorsport.com/rss/f1/news/', 'motorsport', 'pt', 'rss'),
  ('Lamley Group', 'lamley', 'https://lamleygroup.com', NULL, 'collectibles', 'en', 'firecrawl'),
  ('T-Hunted', 'thunted', 'https://www.instagram.com/thuntedoficial', NULL, 'collectibles', 'pt', 'firecrawl'),
  ('Motor1 Brasil', 'motor1', 'https://motor1.com.br', 'https://br.motor1.com/rss/news/', 'cars', 'pt', 'rss'),
  ('RC Groups', 'rcgroups', 'https://rcgroups.com', 'https://www.rcgroups.com/forums/external.php?type=RSS2', 'aeromodeling', 'en', 'rss'),
  ('Autosport', 'autosport', 'https://autosport.com', 'https://www.autosport.com/rss/feed/f1', 'motorsport', 'en', 'rss'),
  ('The Diecast Magazine', 'diecast_mag', 'https://diecastmagazine.net', NULL, 'collectibles', 'en', 'firecrawl');

-- 5. Habilitar RLS
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_news_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_sources ENABLE ROW LEVEL SECURITY;

-- 6. Políticas para artigos (públicos para leitura)
CREATE POLICY "Anyone can read news articles" 
ON public.news_articles FOR SELECT USING (true);

-- 7. Políticas para preferências do usuário
CREATE POLICY "Users can view own preferences" 
ON public.user_news_preferences FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" 
ON public.user_news_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" 
ON public.user_news_preferences FOR UPDATE USING (auth.uid() = user_id);

-- 8. Políticas para fontes (públicas para leitura)
CREATE POLICY "Anyone can read news sources" 
ON public.news_sources FOR SELECT USING (true);

-- 9. Índices para performance
CREATE INDEX idx_news_articles_category ON public.news_articles(category);
CREATE INDEX idx_news_articles_published_at ON public.news_articles(published_at DESC);
CREATE INDEX idx_news_articles_is_featured ON public.news_articles(is_featured) WHERE is_featured = true;