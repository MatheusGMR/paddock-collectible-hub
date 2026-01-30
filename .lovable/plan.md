
# Plano: Detecção de Duplicados e Correção de Imagem

## Contexto
O plano anterior foi aprovado mas ainda não implementado. Preciso continuar com:
1. **Detecção de Duplicados**: Verificar se o item escaneado já existe na coleção do usuário
2. **Correção de Imagem**: Trocar `object-cover` por `object-contain` para mostrar o carrinho inteiro

---

## Parte 1: Migração de Banco de Dados

Adicionar coluna `collectible_color` na tabela `items` para diferenciar carrinhos iguais com cores diferentes.

```sql
ALTER TABLE public.items ADD COLUMN collectible_color text;
```

---

## Parte 2: Atualizar Edge Function (analyze-collectible)

Adicionar campo `color` ao schema de resposta da IA:

```json
{
  "collectible": {
    "color": "Primary color of the diecast (e.g., Red, Blue, Metallic Silver)"
  }
}
```

---

## Parte 3: Criar Função de Verificação de Duplicados

**Arquivo:** `src/lib/database.ts`

```typescript
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingItemId?: string;
  existingItemImage?: string;
}

export const checkDuplicateInCollection = async (
  userId: string,
  brand: string,
  model: string,
  color?: string | null
): Promise<DuplicateCheckResult> => {
  const { data, error } = await supabase
    .from("user_collection")
    .select(`
      id,
      image_url,
      item:items!inner(
        real_car_brand,
        real_car_model,
        collectible_color
      )
    `)
    .eq("user_id", userId);

  if (error) throw error;
  
  const match = (data || []).find((c: any) => {
    const brandMatch = c.item.real_car_brand.toLowerCase() === brand.toLowerCase();
    const modelMatch = c.item.real_car_model.toLowerCase() === model.toLowerCase();
    
    // Se cor foi informada, verificar também
    let colorMatch = true;
    if (color && c.item.collectible_color) {
      colorMatch = c.item.collectible_color.toLowerCase() === color.toLowerCase();
    }
    
    return brandMatch && modelMatch && colorMatch;
  });
  
  return {
    isDuplicate: !!match,
    existingItemId: match?.id,
    existingItemImage: match?.image_url
  };
};
```

---

## Parte 4: Atualizar Interface AnalysisResult

**Arquivos:** `ScannerView.tsx` e `ResultCarousel.tsx`

Adicionar campos:
```typescript
interface AnalysisResult {
  // ... campos existentes
  collectible: {
    // ... campos existentes
    color: string; // NOVO
  };
  isDuplicate?: boolean;      // NOVO
  existingItemImage?: string; // NOVO
}
```

---

## Parte 5: Verificar Duplicados Após Análise

**Arquivo:** `src/components/scanner/ScannerView.tsx`

Após receber os resultados da análise, verificar cada item:

```typescript
// Após cropping, verificar duplicados
const itemsWithDuplicateCheck = await Promise.all(
  itemsWithCrops.map(async (item) => {
    if (user) {
      const duplicate = await checkDuplicateInCollection(
        user.id,
        item.realCar.brand,
        item.realCar.model,
        item.collectible.color
      );
      return {
        ...item,
        isDuplicate: duplicate.isDuplicate,
        existingItemImage: duplicate.existingItemImage
      };
    }
    return item;
  })
);
```

---

## Parte 6: Atualizar UI do ResultCarousel

**Arquivo:** `src/components/scanner/ResultCarousel.tsx`

### 6.1 Correção da Imagem (object-contain)

```tsx
// ANTES
<div className="relative w-full h-32 rounded-xl overflow-hidden bg-muted">
  <img className="w-full h-full object-cover" />
</div>

// DEPOIS
<div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-b from-muted to-muted/50 flex items-center justify-center">
  <img className="max-w-full max-h-full object-contain" />
</div>
```

### 6.2 Aviso de Duplicado

```tsx
{result.isDuplicate && (
  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-3">
    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
    <div>
      <p className="text-sm font-medium text-amber-500">
        {t.scanner.duplicateWarning}
      </p>
      <p className="text-xs text-foreground-secondary">
        {t.scanner.duplicateDescription}
      </p>
    </div>
  </div>
)}
```

### 6.3 Botões Atualizados

```tsx
{result.isDuplicate ? (
  <>
    <Button variant="outline" onClick={() => handleSkip(index)}>
      {t.scanner.discard}
    </Button>
    <Button onClick={() => handleAdd(index)}>
      {t.scanner.addAnyway}
    </Button>
  </>
) : (
  <Button onClick={() => handleAdd(index)}>
    {t.scanner.addToCollection}
  </Button>
)}
```

---

## Parte 7: Atualizar CollectibleDetailCard

**Arquivo:** `src/components/collection/CollectibleDetailCard.tsx`

Corrigir imagem hero para usar `object-contain`:

```tsx
// ANTES
<div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
  <img className="w-full h-full object-cover" />
</div>

// DEPOIS
<div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-b from-muted to-muted/50 flex items-center justify-center">
  <img className="max-w-full max-h-full object-contain" />
</div>
```

---

## Parte 8: Adicionar Traduções

**Arquivos:** `pt-BR.ts` e `en.ts`

```typescript
scanner: {
  // ... existentes
  duplicateWarning: "Você já tem este item",
  duplicateDescription: "Este carrinho já existe na sua coleção",
  addAnyway: "Adicionar Mesmo Assim",
  discard: "Descartar",
  color: "Cor",
}
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/analyze-collectible/index.ts` | Adicionar `color` ao prompt da IA |
| `src/lib/database.ts` | Adicionar `checkDuplicateInCollection` + atualizar `addToCollection` para salvar cor |
| `src/components/scanner/ScannerView.tsx` | Verificar duplicados após análise |
| `src/components/scanner/ResultCarousel.tsx` | Exibir aviso de duplicado + corrigir imagem |
| `src/components/collection/CollectibleDetailCard.tsx` | Corrigir imagem hero |
| `src/lib/i18n/translations/pt-BR.ts` | Adicionar chaves de tradução |
| `src/lib/i18n/translations/en.ts` | Adicionar chaves de tradução em inglês |

---

## Migração de Banco Necessária

```sql
ALTER TABLE public.items ADD COLUMN collectible_color text;
```

---

## Fluxo Completo

```text
1. Usuário captura foto
2. AI analisa e retorna dados (incluindo COR)
3. Para cada item:
   a. Recortar imagem (bounding box)
   b. Verificar se é duplicado na coleção (brand + model + color)
   c. Marcar flag isDuplicate
4. ResultCarousel exibe:
   - Imagem centralizada (object-contain) ✨
   - Aviso amarelo se for duplicado ⚠️
   - Botões: "Descartar" ou "Adicionar Mesmo Assim"
5. Usuário decide e item é adicionado ou descartado
```
