

# Plano: Exibição Completa de Detalhes e Card Super Trunfo

## Problema Identificado

### 1. Scanner (ResultCarousel)
O resultado da análise não mostra todas as informações disponíveis:
- **Faltando**: Fato histórico, origem, ano estimado, notas
- **Atual**: Apenas mostra marca, modelo, fabricante, escala, série e condição

### 2. Coleção (CollectionList)
- Ao clicar num item, nada acontece
- Não existe modal/drawer para ver detalhes completos
- Usuário não consegue ver informações do item salvo

---

## Solução Proposta

### Parte 1: Melhorar ResultCarousel (Scanner)

Adicionar seção expandível ou rolável mostrando:
- Fato histórico do veículo
- Origem do fabricante
- Ano estimado de produção
- Notas adicionais

### Parte 2: Criar Card "Super Trunfo"

Novo componente `CollectibleDetailCard.tsx` que será exibido ao clicar em um item:

```text
+--------------------------------+
|        [FOTO DO ITEM]          |
|         (do scanner)           |
+--------------------------------+
|  FERRARI 250 GTO               |
|  1962 • 1:64                   |
+--------------------------------+
|  ÍNDICE: 85    [ULTRA RARO]    |
|  ████████████████░░░░          |
+--------------------------------+
|  ▼ DADOS DO CARRO REAL         |
|  Marca: Ferrari                |
|  Modelo: 250 GTO               |
|  Ano: 1962                     |
+--------------------------------+
|  ▼ DADOS DO COLECIONÁVEL       |
|  Fabricante: Hot Wheels        |
|  Escala: 1:64                  |
|  Série: RLC Exclusive          |
|  Condição: Mint                |
|  Origem: Thailand              |
|  Notas: ...                    |
+--------------------------------+
|  ▼ FATO HISTÓRICO              |
|  "A Ferrari 250 GTO é um dos   |
|  carros mais valiosos do mundo"|
+--------------------------------+
|  ▼ MÚSICA PARA OUVIR           |
|  🎵 "Highway Star" - Deep      |
|  Purple (1972)                 |
+--------------------------------+
|  ▼ FOTOS DO VEÍCULO REAL       |
|  [img1] [img2] [img3]          |
+--------------------------------+
```

### Parte 3: Atualizar IA para Novos Campos

Adicionar ao prompt da Edge Function `analyze-collectible`:
- `musicSuggestion`: Sugestão de música para ouvir ao dirigir/admirar o carro
- `realCarPhotos`: Array com 3 URLs de fotos do veículo real (de bancos de imagens públicos)

---

## Arquivos a Criar

| Arquivo | Propósito |
|---------|-----------|
| `src/components/collection/CollectibleDetailCard.tsx` | Card estilo Super Trunfo (Drawer fullscreen) |

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/components/scanner/ResultCarousel.tsx` | Adicionar seção scrollable com historicalFact, origin, notes |
| `src/components/profile/CollectionList.tsx` | Abrir CollectibleDetailCard ao clicar |
| `src/pages/Profile.tsx` | Buscar dados completos (incluir campos faltantes) |
| `src/lib/database.ts` | Expandir `getCollectionWithIndex` para trazer todos os campos |
| `supabase/functions/analyze-collectible/index.ts` | Adicionar musicSuggestion e realCarPhotos ao prompt |

## Migração de Banco (Opcional)

Adicionar colunas à tabela `items`:
- `music_suggestion` (text): Sugestão de música
- `real_car_photos` (jsonb): Array de URLs de fotos

---

## Detalhes Técnicos

### 1. Expandir ResultCarousel

```tsx
// Adicionar após "Collectible details" grid
{result.realCar.historicalFact && (
  <div className="pt-2 border-t border-border">
    <p className="text-xs text-primary font-semibold mb-1">Fato Histórico</p>
    <p className="text-sm text-foreground/90">{result.realCar.historicalFact}</p>
  </div>
)}

{result.collectible.origin && (
  <div>
    <span className="text-foreground-secondary">Origem:</span>
    <span className="ml-1 text-foreground">{result.collectible.origin}</span>
  </div>
)}

{result.collectible.notes && (
  <div className="pt-2">
    <p className="text-xs text-foreground-secondary mb-1">Notas</p>
    <p className="text-sm text-foreground/80">{result.collectible.notes}</p>
  </div>
)}
```

### 2. Interface CollectibleDetailCard

```tsx
interface CollectibleDetail {
  id: string;
  image_url: string;
  item: {
    real_car_brand: string;
    real_car_model: string;
    real_car_year: string;
    historical_fact: string;
    collectible_manufacturer: string;
    collectible_scale: string;
    collectible_series: string;
    collectible_origin: string;
    collectible_condition: string;
    collectible_year: string;
    collectible_notes: string;
    price_index: number;
    rarity_tier: string;
    index_breakdown: PriceIndexBreakdown;
    music_suggestion?: string;
    real_car_photos?: string[];
  };
}
```

### 3. Atualização do Prompt da IA

Adicionar ao JSON de resposta:
```json
{
  "realCar": {
    "musicSuggestion": "Nome da música e artista que combina com este carro (ex: 'Highway Star' - Deep Purple)",
    "photos": [
      "https://url-foto-1.jpg",
      "https://url-foto-2.jpg", 
      "https://url-foto-3.jpg"
    ]
  }
}
```

---

## Fluxo do Usuário

### Scanner (Após scan):
```text
1. Scan → Resultado aparece
2. Card mostra: Nome, Ano, Índice (clicável)
3. Rolar para baixo → Ver Fabricante, Escala, Série, Condição
4. Continuar rolando → Ver Origem, Fato Histórico, Notas
5. Clicar "Adicionar" → Salva na coleção
```

### Coleção (Ao ver item salvo):
```text
1. Ir ao Perfil → Aba "BOX" (Collection)
2. Ver lista de carrinhos
3. Clicar em um item → Abre Drawer/Sheet fullscreen
4. Card Super Trunfo com todas as informações
5. Seções colapsáveis: Carro Real, Colecionável, Histórico, Música, Fotos
```

---

## Resumo das Mudanças

| Componente | O que muda |
|------------|------------|
| `ResultCarousel` | Adiciona historicalFact, origin, notes em seção scrollable |
| `CollectionList` | Cada item abre drawer com detalhes |
| `CollectibleDetailCard` (novo) | Card Super Trunfo com todas as infos |
| `database.ts` | Busca todos os campos do item |
| `analyze-collectible` | IA sugere música e retorna 3 fotos do carro real |
| `items` (tabela) | Novos campos: music_suggestion, real_car_photos |

