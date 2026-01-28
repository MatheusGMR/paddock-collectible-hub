
# Plano: Transformar Explore em Mercado (Marketplace)

## Visao Geral

Transformar a secao "Explore" em "Mercado", criando um marketplace completo que combina:
- Anuncios internos de usuarios da plataforma Paddock
- Anuncios externos agregados de multiplas fontes internacionais
- Feed infinito com scroll vertical
- Redirecionamento para lojas externas quando aplicavel

---

## Fontes de Anuncios Externos

### Brasil
| Loja | URL | Categoria |
|------|-----|-----------|
| OLX | olx.com.br | Marketplace geral |
| Mercado Livre | mercadolivre.com.br | Marketplace geral |
| Escala Miniaturas | escalaminiaturas.com.br | Especializada |
| Orangebox Miniaturas | orangeboxminiaturas.com.br | Especializada |
| Semaan | semaanbrinquedos.com.br | Especializada |
| MiniMundi | minimundi.com.br | Especializada |
| MG Minis | mgminis.com | Especializada |
| AutoMOTIVO Store | automotivostore.com.br | Especializada |
| Wale Miniaturas | shopee.com.br/wale_miniaturas | Shopee |
| Coleciona Brinquedos | coleciona.com.br | Especializada |
| Lima Hobbies | limahobbies.com.br | Especializada |
| Shopee Brasil | shopee.com.br | Marketplace geral |

### Estados Unidos
| Loja | URL | Categoria |
|------|-----|-----------|
| Jcar Diecast | jcardiecast.com | Especializada |
| Diecast Models Wholesale | diecastmodelswholesale.com | Atacado |
| Mattel Creations (RLC) | creations.mattel.com | Oficial Hot Wheels |
| A&J Toys | aandjtoys.com | Especializada |
| eBay | ebay.com | Marketplace geral |

### Asia (Japao e China)
| Loja | URL | Categoria |
|------|-----|-----------|
| AliExpress | aliexpress.com | Marketplace geral |
| Hobby Search | 1999.co.jp/eng | Japao |
| AmiAmi | amiami.com | Japao |
| Plaza Japan | plazajapan.com | Japao |
| rcMart | rcmart.com | Asia |

---

## Arquitetura da Solucao

```text
+-------------------+     +----------------------+     +------------------+
|    Frontend       |     |   Edge Function      |     |  Firecrawl API   |
|    Mercado        | --> |  fetch-listings      | --> |  Web Scraping    |
+-------------------+     +----------------------+     +------------------+
        |                          |                           |
        v                          v                           v
+-------------------+     +----------------------+     +------------------+
|   Anuncios        |     |   Cache/Agregacao    |     |  22+ Fontes      |
|   Internos (DB)   |     |   de Resultados      |     |  Externas        |
+-------------------+     +----------------------+     +------------------+
```

---

## Mudancas no Banco de Dados

### Nova Tabela: `listings`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Identificador unico |
| user_id | uuid (nullable) | Usuario vendedor (null se externo) |
| item_id | uuid (nullable) | Referencia ao item da colecao |
| title | text | Titulo do anuncio |
| description | text | Descricao do produto |
| price | numeric | Valor |
| currency | text | Moeda (BRL, USD, JPY, CNY) |
| image_url | text | Imagem principal |
| source | text | Codigo da fonte |
| source_name | text | Nome amigavel da fonte |
| source_country | text | Pais de origem (BR, US, JP, CN) |
| external_url | text (nullable) | Link externo |
| status | text | 'active', 'sold', 'expired' |
| created_at | timestamp | Data de criacao |

### Nova Tabela: `marketplace_sources`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Identificador unico |
| code | text | Codigo unico (ex: 'escala_miniaturas') |
| name | text | Nome amigavel |
| url | text | URL base do site |
| country | text | Codigo do pais |
| category | text | 'marketplace', 'specialized', 'official' |
| logo_url | text | Logo da loja |
| is_active | boolean | Se esta ativa para scraping |
| scrape_config | jsonb | Configuracoes de scraping |

---

## Componentes Frontend

### Novos Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/Mercado.tsx` | Pagina principal do marketplace |
| `src/components/mercado/MercadoHeader.tsx` | Header com busca e filtros |
| `src/components/mercado/ListingCard.tsx` | Card de anuncio |
| `src/components/mercado/ListingFeed.tsx` | Feed infinito |
| `src/components/mercado/SourceBadge.tsx` | Badge com logo/bandeira da fonte |
| `src/components/mercado/SourceFilter.tsx` | Filtro por loja/regiao |
| `src/components/mercado/PriceFilter.tsx` | Filtro por faixa de preco |
| `src/data/marketplaceSources.ts` | Configuracao das fontes |

### Arquivos a Remover

| Arquivo | Motivo |
|---------|--------|
| `src/pages/Explore.tsx` | Substituido por Mercado |
| `src/components/explore/ExploreHeader.tsx` | Substituido |
| `src/components/explore/ExploreGrid.tsx` | Substituido |

---

## Design do Card de Anuncio

```text
+----------------------------------+
|  [IMAGEM DO ITEM]                |
|                     [🇧🇷 Badge]  |
+----------------------------------+
|  [Logo Loja] R$ 120,00           |
|  Ferrari 250 GTO - Hot Wheels    |
|  Escala Miniaturas               |
+----------------------------------+
```

Elementos visuais:
- Bandeira do pais no canto superior
- Logo pequeno da loja origem
- Preco com moeda correta (R$, $, ¥)
- Nome do item
- Nome da loja de origem

---

## Filtros Disponiveis

### Por Regiao
- Todas
- Brasil
- Estados Unidos
- Asia (Japao/China)

### Por Tipo de Loja
- Todas
- Marketplaces (OLX, ML, eBay, Ali)
- Especializadas (Escala, Orangebox, etc)
- Oficiais (Mattel Creations)
- Paddock (usuarios internos)

### Por Preco
- Qualquer valor
- Ate R$ 50
- R$ 50 - R$ 150
- R$ 150 - R$ 500
- Acima de R$ 500

---

## Edge Function: fetch-listings

### Responsabilidades
1. Buscar anuncios internos do banco de dados
2. Chamar Firecrawl para scraping das fontes externas
3. Normalizar precos para BRL (conversao de moedas)
4. Mesclar e ordenar resultados
5. Cachear resultados para performance

### Parametros de Entrada
```text
{
  search?: string,
  sources?: string[],
  country?: string,
  min_price?: number,
  max_price?: number,
  page?: number,
  limit?: number
}
```

### Resposta
```text
{
  listings: [...],
  total: number,
  has_more: boolean,
  sources_status: {
    [source]: 'success' | 'error' | 'cached'
  }
}
```

---

## Navegacao

### BottomNav.tsx
- Icone: `ShoppingBag` (no lugar de `Compass`)
- Label: "Mercado" (no lugar de "Explore")
- Rota: `/mercado` (no lugar de `/explore`)

### App.tsx
- Substituir rota `/explore` por `/mercado`
- Importar novo componente `Mercado`

---

## Funcoes de Banco de Dados

Adicionar em `src/lib/database.ts`:

| Funcao | Descricao |
|--------|-----------|
| `getListings(filters)` | Buscar anuncios com filtros e paginacao |
| `createListing(data)` | Criar anuncio interno |
| `getMarketplaceSources()` | Listar fontes disponiveis |
| `getListingById(id)` | Detalhes de um anuncio |

---

## Fluxo de Usuario

1. Usuario acessa aba "Mercado"
2. Ve feed misto com anuncios de 22+ fontes
3. Pode identificar origem pelo badge/bandeira
4. Filtra por regiao, loja ou preco
5. Ao clicar em anuncio:
   - **Interno (Paddock)**: abre detalhes no app
   - **Externo**: `window.open(external_url, '_blank')`

---

## Integracao com Firecrawl

Para scraping real das lojas externas, sera necessario:
1. Conectar Firecrawl via conector
2. Configurar regras de scraping por loja
3. Implementar cache para evitar requests excessivos

Na primeira versao, usaremos mock data representando cada fonte, ja com a estrutura pronta para integracao real.

---

## Ordem de Implementacao

1. Criar migracao do banco (listings, marketplace_sources)
2. Popular tabela de fontes com as 22+ lojas
3. Atualizar navegacao (BottomNav, App.tsx)
4. Criar configuracao de fontes no frontend
5. Criar componentes do Mercado
6. Implementar Edge Function
7. Adicionar mock data representando cada fonte
8. Testar fluxo completo
