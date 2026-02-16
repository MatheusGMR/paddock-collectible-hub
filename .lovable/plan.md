
# Valor de Mercado - Sistema de Precos para Colecionaveis

## Visao Geral

Criar um sistema de estimativa de valor de mercado que aparece no card de resultados do scanner (abaixo do indice de raridade) e que permite ao usuario dar seu "palpite de preco". Todos os precos alimentam uma base de dados centralizada que serve para totalizar o valor da colecao e criar um banco de precos de referencia.

## Arquitetura

O sistema funciona em 3 camadas:

1. **Estimativa automatica da IA** - A IA ja analisa o colecionavel; adicionamos ao prompt um campo `marketValue` com faixa de preco estimada baseada em dados publicos (OLX, Mercado Livre, feiras, grupos)
2. **Palpite do usuario** - O usuario pode informar quanto acha que vale ou quanto pagou
3. **Base de precos agregada** - Tabela `price_estimates` armazena todas as estimativas, permitindo calcular mediana/media por item no futuro

---

## Mudancas no Banco de Dados

### Nova tabela: `price_estimates`

Armazena cada estimativa de preco (da IA ou do usuario):

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| item_id | uuid | FK para items |
| user_id | uuid | Quem estimou |
| source | text | "ai", "user_guess", "user_paid" |
| price_min_brl | numeric | Valor minimo (faixa) |
| price_max_brl | numeric | Valor maximo (faixa) |
| price_brl | numeric | Valor exato (palpite do usuario) |
| currency | text | Default "BRL" |
| notes | text | Contexto opcional |
| created_at | timestamptz | Default now() |

### Novas colunas na tabela `items`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| estimated_value_min | numeric | Faixa minima da IA |
| estimated_value_max | numeric | Faixa maxima da IA |

### RLS Policies para `price_estimates`

- SELECT: Qualquer um pode ver (dados publicos de mercado)
- INSERT: Usuarios autenticados (user_id = auth.uid())
- UPDATE: Usuarios podem editar suas proprias estimativas
- DELETE: Usuarios podem remover suas proprias estimativas

---

## Mudancas na Edge Function (analyze-collectible)

### Adicao ao prompt (`BASE_PROMPT`)

Adicionar ao prompt de analise um novo campo obrigatorio:

```text
marketValue: {"min": N, "max": N, "currency": "BRL", "source": "descricao das fontes", "confidence": "high"|"medium"|"low"}
```

A IA deve estimar o valor de mercado em Reais considerando:
- Precos tipicos em OLX, Mercado Livre, Shopee
- Precos de feiras e encontros de colecionadores
- Grupos de Facebook e WhatsApp
- Estado de conservacao e raridade

### Processamento da resposta

Ao receber a resposta, extrair `marketValue` e salvar automaticamente na tabela `price_estimates` (source = "ai") e nas novas colunas `estimated_value_min`/`estimated_value_max` do item.

---

## Mudancas no Frontend

### 1. Novo componente: `MarketValueCard`

Exibido logo abaixo do `ScoreHero` (indice de raridade) no `ResultCarousel`:

- Mostra faixa de preco: "R$ 15 - R$ 45"
- Badge de confianca (alta/media/baixa)
- Fonte: "Baseado em OLX, ML, feiras"
- Botao "Dar meu palpite" que abre um input inline

### 2. Componente: `UserPriceGuess`

Input simples que permite o usuario digitar:
- Valor que acha que vale (palpite)
- Ou valor que pagou
- Salva na tabela `price_estimates`

### 3. Atualizacao do `ResultCarousel`

- Adicionar `MarketValueCard` entre o `ScoreHero` e as secoes colapsaveis
- Passar dados de `marketValue` do resultado da IA

### 4. Atualizacao do `CollectibleDetailCard`

- Mostrar valor de mercado na visualizacao detalhada da colecao
- Permitir usuario adicionar/editar palpite de preco

### 5. Totalizacao da Colecao

Na pagina de perfil/colecao, somar os valores estimados de todos os itens para mostrar "Valor estimado da colecao: R$ X.XXX"

---

## Detalhes Tecnicos

### Arquivos a criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/scanner/MarketValueCard.tsx` | Card de valor de mercado no resultado do scanner |
| `src/components/scanner/UserPriceGuess.tsx` | Input de palpite de preco do usuario |

### Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/analyze-collectible/index.ts` | Adicionar `marketValue` ao prompt; salvar estimativa no DB |
| `src/components/scanner/ResultCarousel.tsx` | Adicionar `MarketValueCard` abaixo do `ScoreHero` |
| `src/components/collection/CollectibleDetailCard.tsx` | Mostrar valor de mercado e palpite |
| `src/lib/database.ts` | Funcoes para salvar/buscar estimativas de preco; calcular total da colecao |
| `src/lib/priceIndex.ts` | Adicionar interface `MarketValue` |
| `src/components/scanner/ScannerView.tsx` | Passar `marketValue` para `ResultCarousel`; salvar estimativa ao adicionar item |
| `src/components/profile/ProfileHeader.tsx` | Mostrar valor total estimado da colecao |

### Fluxo de dados

1. Usuario escaneia item
2. IA retorna `marketValue` junto com os dados existentes
3. Card mostra faixa de preco abaixo do indice de raridade
4. Usuario pode dar palpite (opcional)
5. Ao adicionar a colecao, `estimated_value_min`/`max` sao salvos no item
6. Palpite do usuario vai para `price_estimates`
7. Perfil soma todos os valores para mostrar total da colecao

### Formato do `MarketValueCard`

```text
+------------------------------------------+
|  Valor de Mercado Estimado               |
|  R$ 15 - R$ 45          Confianca: Media |
|  Baseado em OLX, ML, feiras             |
|                                          |
|  [Dar meu palpite]   [Quanto paguei]     |
+------------------------------------------+
```
