-- Tabela de fontes do marketplace
CREATE TABLE public.marketplace_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  country TEXT NOT NULL,
  category TEXT NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  scrape_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de anúncios/listings
CREATE TABLE public.listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  item_id UUID REFERENCES public.items(id),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  image_url TEXT NOT NULL,
  source TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_country TEXT NOT NULL DEFAULT 'BR',
  external_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.marketplace_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Políticas para marketplace_sources (leitura pública)
CREATE POLICY "Anyone can view marketplace sources"
ON public.marketplace_sources FOR SELECT
USING (true);

-- Políticas para listings
CREATE POLICY "Anyone can view active listings"
ON public.listings FOR SELECT
USING (status = 'active');

CREATE POLICY "Users can create own listings"
ON public.listings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings"
ON public.listings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings"
ON public.listings FOR DELETE
USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_source ON public.listings(source);
CREATE INDEX idx_listings_source_country ON public.listings(source_country);
CREATE INDEX idx_listings_price ON public.listings(price);
CREATE INDEX idx_listings_created_at ON public.listings(created_at DESC);

-- Popular tabela de fontes com as 22+ lojas
INSERT INTO public.marketplace_sources (code, name, url, country, category) VALUES
-- Brasil - Marketplaces
('olx', 'OLX', 'https://olx.com.br', 'BR', 'marketplace'),
('mercadolivre', 'Mercado Livre', 'https://mercadolivre.com.br', 'BR', 'marketplace'),
('shopee', 'Shopee Brasil', 'https://shopee.com.br', 'BR', 'marketplace'),
-- Brasil - Especializadas
('escala_miniaturas', 'Escala Miniaturas', 'https://escalaminiaturas.com.br', 'BR', 'specialized'),
('orangebox', 'Orangebox Miniaturas', 'https://orangeboxminiaturas.com.br', 'BR', 'specialized'),
('semaan', 'Semaan', 'https://semaanbrinquedos.com.br', 'BR', 'specialized'),
('minimundi', 'MiniMundi', 'https://minimundi.com.br', 'BR', 'specialized'),
('mgminis', 'MG Minis', 'https://mgminis.com', 'BR', 'specialized'),
('automotivo', 'AutoMOTIVO Store', 'https://automotivostore.com.br', 'BR', 'specialized'),
('wale', 'Wale Miniaturas', 'https://shopee.com.br/wale_miniaturas', 'BR', 'specialized'),
('coleciona', 'Coleciona Brinquedos', 'https://coleciona.com.br', 'BR', 'specialized'),
('limahobbies', 'Lima Hobbies', 'https://limahobbies.com.br', 'BR', 'specialized'),
-- EUA
('jcardiecast', 'Jcar Diecast', 'https://jcardiecast.com', 'US', 'specialized'),
('diecastwholesale', 'Diecast Models Wholesale', 'https://diecastmodelswholesale.com', 'US', 'wholesale'),
('mattel_rlc', 'Mattel Creations (RLC)', 'https://creations.mattel.com', 'US', 'official'),
('ajtoys', 'A&J Toys', 'https://aandjtoys.com', 'US', 'specialized'),
('ebay', 'eBay', 'https://ebay.com', 'US', 'marketplace'),
-- Ásia
('aliexpress', 'AliExpress', 'https://aliexpress.com', 'CN', 'marketplace'),
('hobbysearch', 'Hobby Search', 'https://1999.co.jp/eng', 'JP', 'specialized'),
('amiami', 'AmiAmi', 'https://amiami.com', 'JP', 'specialized'),
('plazajapan', 'Plaza Japan', 'https://plazajapan.com', 'JP', 'specialized'),
('rcmart', 'rcMart', 'https://rcmart.com', 'CN', 'specialized'),
-- Paddock (interno)
('paddock', 'Paddock', 'https://paddock.app', 'BR', 'internal');