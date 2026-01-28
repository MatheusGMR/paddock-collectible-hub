
# Plano: Indice de Precificacao para Colecionaveis

## Visao Geral

Criar um sistema de indice de precificacao que avalia cada colecionavel escaneado com base em criterios como raridade, condicao, fabricante e outros fatores. O indice sera:
- Calculado automaticamente ao escanear um item
- Exibido como um numero clicavel no resultado do scanner
- Acessivel em uma pagina dedicada com todos os itens ja capturados para comparacao

---

## Criterios do Indice de Precificacao

O indice sera calculado de 1 a 100 pontos, considerando:

| Criterio | Peso | Descricao |
|----------|------|-----------|
| Raridade | 35% | Series limitadas, RLC, Chase, Super Treasure Hunt |
| Condicao | 25% | Mint, Near Mint, Good, Fair |
| Fabricante | 15% | Hot Wheels, Matchbox, Tomica, Greenlight, etc |
| Escala | 10% | 1:18 vale mais que 1:64 tipicamente |
| Idade | 10% | Itens vintage (pre-2000) pontuam mais |
| Origem | 5% | Made in Japan, Thailand vs China |

---

## Arquitetura da Solucao

```text
+------------------+     +---------------------+     +------------------+
|    Scanner       |     |   Edge Function     |     |   AI Analysis    |
|    (Foto)        | --> | analyze-collectible | --> |   + Price Index  |
+------------------+     +---------------------+     +------------------+
        |                         |
        v                         v
+------------------+     +---------------------+
|   Result View    |     |   DB: items table   |
|   [Indice: 85]   |     |   price_index: 85   |
+------------------+     +---------------------+
        |
        v
+------------------+
|   Index Page     |
|   (Comparacao)   |
+------------------+
```

---

## Mudancas no Banco de Dados

### Alterar Tabela: `items`

Adicionar nova coluna:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| price_index | integer | Indice de 1-100 baseado em raridade e outros fatores |
| rarity_tier | text | 'common', 'uncommon', 'rare', 'super_rare', 'ultra_rare' |
| index_breakdown | jsonb | Detalhamento dos pontos por criterio |

---

## Componentes e Arquivos

### Novos Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/PriceIndex.tsx` | Pagina com ranking de todos itens capturados |
| `src/components/index/IndexCard.tsx` | Card de item no ranking |
| `src/components/index/IndexBadge.tsx` | Badge clicavel com o numero do indice |
| `src/components/index/IndexBreakdown.tsx` | Modal/Sheet com detalhamento dos criterios |
| `src/components/index/IndexFilters.tsx` | Filtros por raridade, fabricante, etc |
| `src/lib/priceIndex.ts` | Logica de calculo do indice no frontend (referencia) |

### Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/analyze-collectible/index.ts` | Adicionar calculo do price_index na resposta |
| `src/components/scanner/ScannerView.tsx` | Exibir badge do indice clicavel |
| `src/lib/database.ts` | Adicionar funcoes para buscar items com indice |
| `src/components/layout/BottomNav.tsx` | Considerar adicionar acesso ao Indice (opcional) |
| `src/pages/Profile.tsx` | Adicionar link para ver indice da colecao |

---

## Design da Interface

### Badge do Indice no Scanner

Apos escanear, junto com os detalhes do item:

```text
+----------------------------------+
|  Ferrari 250 GTO - Hot Wheels    |
|  1965 • 1:64                     |
|                                  |
|  +---------------------------+   |
|  |  INDICE DE VALOR          |   |
|  |  [  85  ]  Raro           |   |
|  |  Toque para ver criterios |   |
|  +---------------------------+   |
+----------------------------------+
```

### Modal de Criterios (ao clicar no indice)

```text
+----------------------------------+
|  INDICE DE VALOR: 85             |
+----------------------------------+
|  Raridade          32/35 pts     |
|  ████████████████░░░ Super TH    |
|                                  |
|  Condicao          23/25 pts     |
|  ██████████████████░ Near Mint   |
|                                  |
|  Fabricante        12/15 pts     |
|  █████████████░░░░░ Hot Wheels   |
|                                  |
|  Escala             8/10 pts     |
|  ████████████████░░ 1:64         |
|                                  |
|  Idade              7/10 pts     |
|  ██████████████░░░░ 2019         |
|                                  |
|  Origem             3/5 pts      |
|  ████████████░░░░░░ Malaysia     |
+----------------------------------+
```

### Pagina de Indice (Ranking)

```text
+----------------------------------+
|  INDICE PADDOCK                  |
|  [Buscar...]    [Filtros]        |
+----------------------------------+
|  #1  [IMG] Ferrari 250 GTO   85  |
|      Hot Wheels • Super TH       |
+----------------------------------+
|  #2  [IMG] Porsche 911 GT3   78  |
|      Tomica • Limited            |
+----------------------------------+
|  #3  [IMG] Toyota Supra      72  |
|      Hot Wheels • Premium        |
+----------------------------------+
```

---

## Edge Function: Calculo do Indice

### Prompt Atualizado para IA

O prompt sera atualizado para incluir:
- Identificacao de series especiais (Super Treasure Hunt, RLC, Chase, etc)
- Estimativa de raridade baseada em caracteristicas visuais
- Calculo estruturado do indice com breakdown

### Nova Estrutura de Resposta

```text
{
  "identified": true,
  "realCar": { ... },
  "collectible": { ... },
  "priceIndex": {
    "score": 85,
    "tier": "rare",
    "breakdown": {
      "rarity": { "score": 32, "max": 35, "reason": "Super Treasure Hunt" },
      "condition": { "score": 23, "max": 25, "reason": "Near Mint" },
      "manufacturer": { "score": 12, "max": 15, "reason": "Hot Wheels" },
      "scale": { "score": 8, "max": 10, "reason": "1:64" },
      "age": { "score": 7, "max": 10, "reason": "2019" },
      "origin": { "score": 3, "max": 5, "reason": "Malaysia" }
    }
  }
}
```

---

## Navegacao e Acesso ao Indice

### Opcao 1: Botao no Menu do Perfil
Adicionar botao "Ver Indice" na pagina de perfil que leva para `/indice`

### Opcao 2: Tab no Perfil
Adicionar terceira aba "Indice" nas tabs do perfil (Posts | Colecao | Indice)

### Opcao 3: Acesso via Colecao
Cada item na lista de colecao mostra o indice, com botao para ver ranking completo

Recomendacao: Implementar Opcao 2 (tab no perfil) para acesso facil e contextual.

---

## Funcoes de Banco de Dados

Adicionar em `src/lib/database.ts`:

| Funcao | Descricao |
|--------|-----------|
| `getCollectionWithIndex(userId)` | Busca colecao ordenada por indice |
| `getTopIndexItems(userId, limit)` | Top N itens por indice |
| `updateItemIndex(itemId, indexData)` | Atualiza indice de um item |

---

## Fluxo do Usuario

1. Usuario escaneia um colecionavel
2. IA analisa e calcula o indice automaticamente
3. Resultado mostra badge "Indice: 85 - Raro" (clicavel)
4. Ao clicar, abre modal com breakdown dos criterios
5. Usuario adiciona a colecao (indice e salvo junto)
6. No perfil, aba "Indice" mostra ranking de toda colecao
7. Usuario pode comparar raridade entre seus itens

---

## Ordem de Implementacao

1. Criar migracao do banco (adicionar colunas price_index, rarity_tier, index_breakdown)
2. Atualizar Edge Function com novo prompt e calculo de indice
3. Criar componente IndexBadge e IndexBreakdown (modal)
4. Atualizar ScannerView para exibir e salvar o indice
5. Atualizar database.ts com funcoes de indice
6. Criar pagina PriceIndex.tsx
7. Adicionar tab "Indice" no ProfileTabs
8. Testar fluxo completo

---

## Consideracoes Tecnicas

### Precisao do Indice
- O calculo e baseado em analise visual da IA, podendo haver margem de erro
- Usuarios poderao eventualmente ajustar manualmente (fase futura)

### Performance
- Indice calculado uma vez no momento do scan
- Armazenado no banco para consultas rapidas
- Ranking ordenado por indice para comparacao instantanea

### Escalabilidade
- Estrutura JSONB permite adicionar novos criterios sem migracao
- Tier de raridade facilita filtragem rapida
