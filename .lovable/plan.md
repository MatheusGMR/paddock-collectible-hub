
# Plano: Transformar Mercado em Hub de Notícias e Informações

## Visão Geral

O "Mercado" deixará de exibir anúncios de carros à venda e passará a ser um **portal de notícias e curiosidades** sobre:
- Mundo dos colecionáveis (Hot Wheels, Tomica, miniaturas)
- Automobilismo (F1, NASCAR, Rally, Le Mans)
- Aeromodelismo (aviões, drones, modelos em escala)
- Carros e aviões reais
- Lançamentos e novidades do mercado

O usuário poderá configurar seus interesses e receber conteúdo personalizado.

---

## Arquitetura da Solução

### Fontes de Conteúdo

```text
┌─────────────────────────────────────────────────────────────┐
│                     FONTES DE NOTÍCIAS                      │
├─────────────────────────────────────────────────────────────┤
│  RSS Feeds              │  Web Scraping (Firecrawl)         │
│  ├─ Motorsport.com      │  ├─ Hot Wheels News               │
│  ├─ Autosport           │  ├─ Lamley Group                  │
│  ├─ Motor1              │  ├─ Thehobbydb                    │
│  ├─ CarThrottle         │  ├─ The Diecast Magazine          │
│  └─ RC Groups           │  └─ T-Hunted                      │
├─────────────────────────────────────────────────────────────┤
│                    PERPLEXITY AI                            │
│  Busca inteligente por notícias em tempo real               │
│  Resumos e curadoria automática                             │
└─────────────────────────────────────────────────────────────┘
```

### Metodologia de Captação

| Método | Uso | Vantagem |
|--------|-----|----------|
| **RSS Feeds** | Notícias de automobilismo e RC | Atualização automática, padronizado |
| **Firecrawl Search** | Blogs de colecionáveis | Busca em sites específicos |
| **Perplexity AI** | Curadoria inteligente | Resumos, contexto, tempo real |

---

## Estrutura de Dados

### Nova Tabela: `news_articles`

```sql
CREATE TABLE public.news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  content text,
  image_url text,
  source_url text NOT NULL,
  source_name text NOT NULL,
  source_logo text,
  category text NOT NULL, -- 'collectibles', 'motorsport', 'aeromodeling', 'cars', 'planes'
  subcategory text,       -- 'hot_wheels', 'f1', 'rally', 'drones', etc
  published_at timestamptz,
  fetched_at timestamptz DEFAULT now(),
  language text DEFAULT 'pt',
  tags text[],
  is_featured boolean DEFAULT false,
  view_count integer DEFAULT 0,
  UNIQUE(source_url)
);
```

### Nova Tabela: `user_news_preferences`

```sql
CREATE TABLE public.user_news_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  categories text[] DEFAULT ARRAY['collectibles', 'motorsport'],
  subcategories text[],
  sources text[],
  language text DEFAULT 'pt',
  notifications_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);
```

### Nova Tabela: `news_sources`

```sql
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
  fetch_method text DEFAULT 'rss', -- 'rss', 'firecrawl', 'perplexity'
  last_fetched_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

---

## Categorias e Subcategorias

| Categoria | Subcategorias | Fontes |
|-----------|---------------|--------|
| **Colecionáveis** | Hot Wheels, Tomica, Matchbox, Diecast, Miniaturas | Lamley Group, T-Hunted, TheHobbyDB |
| **Automobilismo** | F1, NASCAR, Rally, Le Mans, IndyCar, DTM | Motorsport, Autosport, Motor1 |
| **Aeromodelismo** | RC Planes, Drones, Jet Models, Helicopters | RC Groups, FliteTest |
| **Carros** | Lançamentos, Clássicos, Elétricos, Conceitos | CarThrottle, Motor1, TopGear |
| **Aviões** | Aviação Comercial, Militar, Espacial | AirwaysNews, AviationWeek |

---

## Componentes a Criar

### 1. Página Principal (Mercado.tsx refatorada)

```text
┌────────────────────────────────────────────┐
│  🔍 Buscar notícias...          [⚙️] [🔔] │
├────────────────────────────────────────────┤
│  [Todos] [🏎️] [✈️] [🚗] [🎮]             │ ← Filtros por categoria
├────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐  │
│  │  ★ DESTAQUE                         │  │
│  │  [Imagem Grande]                    │  │
│  │  Novo Hot Wheels RLC 2024           │  │
│  │  Lamley Group • 2h atrás            │  │
│  └──────────────────────────────────────┘  │
├────────────────────────────────────────────┤
│  ÚLTIMAS NOTÍCIAS                          │
│  ┌─────────┐ ┌─────────┐                   │
│  │ [img]   │ │ [img]   │                   │
│  │ Título  │ │ Título  │                   │
│  │ Fonte   │ │ Fonte   │                   │
│  └─────────┘ └─────────┘                   │
│  ┌─────────┐ ┌─────────┐                   │
│  │ ...     │ │ ...     │                   │
│  └─────────┘ └─────────┘                   │
└────────────────────────────────────────────┘
```

### 2. Card de Notícia (NewsCard.tsx)

```text
┌────────────────────────────────────────────┐
│  [Imagem 16:9]                             │
│                              [DESTAQUE]    │
├────────────────────────────────────────────┤
│  🏎️ Automobilismo                         │
│  Hamilton confirma ida para Ferrari        │
│  em 2025 após rumores...                   │
│                                            │
│  [Logo] Motorsport.com • 3h atrás          │
└────────────────────────────────────────────┘
```

### 3. Modal de Preferências (NewsPreferencesModal.tsx)

```text
┌────────────────────────────────────────────┐
│  Configurar Feed              [X]          │
├────────────────────────────────────────────┤
│  Seus Interesses                           │
│  ┌────────┐ ┌────────┐ ┌────────┐         │
│  │ ✓ 🏎️  │ │ ✓ 🎮  │ │   ✈️  │         │
│  │ Motor  │ │ Colec. │ │ Aero  │         │
│  └────────┘ └────────┘ └────────┘         │
│                                            │
│  Subcategorias                             │
│  [✓] F1  [✓] Hot Wheels  [ ] NASCAR       │
│  [✓] Rally  [ ] Tomica  [ ] Drones        │
│                                            │
│  Idioma                                    │
│  (•) Português  ( ) Inglês  ( ) Ambos     │
│                                            │
│  [Salvar Preferências]                     │
└────────────────────────────────────────────┘
```

### 4. Página de Detalhes (NewsDetail.tsx)

Ao clicar em uma notícia, exibe o conteúdo completo ou redireciona para o site original.

---

## Edge Functions

### 1. `fetch-news` (Nova)

Busca notícias de múltiplas fontes:

```typescript
// Combina RSS + Firecrawl + Perplexity
const sources = [
  { type: 'rss', url: 'https://motorsport.com/rss/f1/news/' },
  { type: 'firecrawl', query: 'hot wheels news 2024', sites: ['lamleygroup.com'] },
  { type: 'perplexity', query: 'últimas notícias colecionáveis diecast' }
];
```

### 2. `fetch-rss` (Nova)

Parser de RSS feeds:

```typescript
// Parseia feeds RSS e extrai artigos
const feed = await parseRSS(rssUrl);
const articles = feed.items.map(item => ({
  title: item.title,
  summary: item.description,
  image_url: extractImage(item),
  source_url: item.link,
  published_at: item.pubDate
}));
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/news/NewsCard.tsx` | Card de notícia individual |
| `src/components/news/NewsFeed.tsx` | Feed de notícias com infinite scroll |
| `src/components/news/NewsHeader.tsx` | Header com busca e filtros |
| `src/components/news/CategoryFilter.tsx` | Filtros por categoria |
| `src/components/news/NewsPreferencesModal.tsx` | Modal de configuração |
| `src/components/news/FeaturedNews.tsx` | Card de destaque |
| `src/pages/NewsDetail.tsx` | Página de detalhes da notícia |
| `src/lib/api/news.ts` | API client para notícias |
| `src/hooks/useNewsPreferences.ts` | Hook para preferências |
| `supabase/functions/fetch-news/index.ts` | Edge function principal |
| `supabase/functions/fetch-rss/index.ts` | Parser de RSS |

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Mercado.tsx` | Refatorar completamente para exibir notícias |
| `src/lib/i18n/translations/pt-BR.ts` | Adicionar chaves de tradução |
| `src/lib/i18n/translations/en.ts` | Adicionar chaves em inglês |
| `src/App.tsx` | Adicionar rota `/news/:id` |

## Arquivos a Remover (ou Manter para Referência)

| Arquivo | Ação |
|---------|------|
| `src/components/mercado/ListingCard.tsx` | Manter (pode ser útil para listagens internas) |
| `src/components/mercado/ListingFeed.tsx` | Remover |
| `src/components/mercado/MercadoHeader.tsx` | Refatorar → NewsHeader |
| `src/components/mercado/SourceFilter.tsx` | Refatorar → CategoryFilter |
| `src/data/mockListings.ts` | Remover |
| `supabase/functions/fetch-listings/index.ts` | Remover ou manter para uso futuro |

---

## Migrações de Banco de Dados

```sql
-- 1. Criar tabela de artigos
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

-- 2. Criar tabela de preferências
CREATE TABLE public.user_news_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  categories text[] DEFAULT ARRAY['collectibles', 'motorsport'],
  subcategories text[],
  sources text[],
  language text DEFAULT 'pt',
  notifications_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Criar tabela de fontes
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
  ('T-Hunted', 'thunted', 'https://www.facebook.com/thuntedoficial', NULL, 'collectibles', 'pt', 'firecrawl'),
  ('Motor1', 'motor1', 'https://motor1.com.br', 'https://br.motor1.com/rss/news/', 'cars', 'pt', 'rss'),
  ('RC Groups', 'rcgroups', 'https://rcgroups.com', 'https://www.rcgroups.com/forums/external.php?type=RSS2', 'aeromodeling', 'en', 'rss');

-- 5. RLS Policies
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_news_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_sources ENABLE ROW LEVEL SECURITY;

-- Artigos são públicos para leitura
CREATE POLICY "Anyone can read news" ON public.news_articles FOR SELECT USING (true);

-- Preferências do usuário
CREATE POLICY "Users can manage own preferences" ON public.user_news_preferences 
  FOR ALL USING (auth.uid() = user_id);

-- Fontes são públicas para leitura
CREATE POLICY "Anyone can read sources" ON public.news_sources FOR SELECT USING (true);
```

---

## Traduções a Adicionar

```typescript
// pt-BR.ts
news: {
  title: "Notícias",
  searchPlaceholder: "Buscar notícias...",
  noNewsFound: "Nenhuma notícia encontrada",
  noNewsFoundDesc: "Tente ajustar os filtros ou buscar por outro termo",
  featured: "Destaque",
  latestNews: "Últimas Notícias",
  readMore: "Ler mais",
  hoursAgo: "h atrás",
  minutesAgo: "min atrás",
  justNow: "Agora",
  categories: {
    all: "Todos",
    collectibles: "Colecionáveis",
    motorsport: "Automobilismo",
    aeromodeling: "Aeromodelismo",
    cars: "Carros",
    planes: "Aviões",
  },
  subcategories: {
    f1: "Fórmula 1",
    nascar: "NASCAR",
    rally: "Rally",
    lemans: "Le Mans",
    hot_wheels: "Hot Wheels",
    tomica: "Tomica",
    matchbox: "Matchbox",
    diecast: "Diecast",
    drones: "Drones",
    rc_planes: "Aeromodelos RC",
  },
  preferences: {
    title: "Configurar Feed",
    interests: "Seus Interesses",
    subcategories: "Subcategorias",
    language: "Idioma",
    portuguese: "Português",
    english: "Inglês",
    both: "Ambos",
    save: "Salvar Preferências",
    notifications: "Notificações de Novidades",
  },
  sources: "Fontes",
  openOriginal: "Ver no site original",
}
```

---

## Fluxo do Sistema

```text
1. Usuário abre a aba "Mercado" (agora "Notícias")
2. Sistema verifica preferências do usuário no banco
   - Se não existem: mostra todas as categorias
   - Se existem: filtra por preferências
3. Busca artigos no banco (cache)
4. Se artigos antigos (>1h): aciona fetch-news em background
5. fetch-news combina:
   a. RSS feeds → parse e salva
   b. Firecrawl search → scrape e salva
   c. Perplexity → curadoria e salva
6. Artigos novos aparecem em tempo real (opcional: realtime)
7. Usuário pode:
   - Filtrar por categoria
   - Buscar por termo
   - Configurar preferências
   - Ler artigo completo ou ir ao site original
```

---

## Conexões Necessárias

O projeto já possui:
- **Firecrawl** - Para scraping de sites de notícias
- **Perplexity** - Disponível para conexão (não conectado ainda)

Recomendação: **Conectar Perplexity** para curadoria inteligente de notícias.

---

## Resumo das Mudanças

| Antes | Depois |
|-------|--------|
| Listagem de anúncios de carros | Feed de notícias e curiosidades |
| Filtro por país/loja | Filtro por categoria/subcategoria |
| Cards de produtos à venda | Cards de artigos/notícias |
| Preços e links externos | Resumos, imagens e fontes |
| Sem personalização | Preferências configuráveis do usuário |
| Firecrawl para buscar anúncios | Firecrawl + RSS + Perplexity para notícias |
