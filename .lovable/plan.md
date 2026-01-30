
# Plano: Scanner de Carro Real → Buscar Miniatura para Comprar

## Resumo
Adicionar um segundo modo ao scanner: além de identificar carrinhos colecionáveis e adicionar à coleção, o usuário poderá fotografar um **carro real** (tamanho normal) e o sistema irá:
1. Identificar marca, modelo e ano do carro real
2. Buscar versões em miniatura/diecast desse carro no marketplace
3. Exibir listagens para compra

---

## Fluxo do Usuário

```text
┌─────────────────────────────────┐
│         SCANNER ABERTO          │
│                                 │
│   [Carrinho] ou [Carro Real]?   │
│                                 │
│    ┌────────┐   ┌────────┐      │
│    │ 🚗     │   │ 🚙     │      │
│    │Carrinho│   │ Carro  │      │
│    │        │   │ Real   │      │
│    └────────┘   └────────┘      │
│                                 │
│         ( ● ) Capturar          │
└─────────────────────────────────┘

        Se "Carro Real" selecionado:
                ↓
┌─────────────────────────────────┐
│     ANÁLISE DO CARRO REAL       │
│                                 │
│  🚙 Ferrari 250 GTO (1962)      │
│                                 │
│  "Buscando miniaturas..."       │
│                                 │
└─────────────────────────────────┘
                ↓
┌─────────────────────────────────┐
│    RESULTADOS DO MARKETPLACE    │
│                                 │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐   │
│  │HW  │ │Tom │ │Majo│ │Kyos│   │
│  │$15 │ │$45 │ │$12 │ │$89 │   │
│  └────┘ └────┘ └────┘ └────┘   │
│                                 │
│  [Ver no Mercado] [Scan Outro]  │
└─────────────────────────────────┘
```

---

## Componentes da Solução

### 1. Toggle de Modo no Scanner
Adicionar seletor discreto no topo do scanner para alternar entre:
- **Carrinho** (modo atual) - Identifica miniaturas → Adiciona à coleção
- **Carro Real** (novo modo) - Identifica carro real → Busca miniaturas para comprar

### 2. Nova Edge Function: `analyze-real-car`
Função dedicada para analisar fotos de carros reais (não miniaturas):
- Usa Gemini Flash para identificar marca, modelo, ano
- Retorna dados estruturados do veículo
- Gera termos de busca otimizados para o marketplace

### 3. Tela de Resultados Específica
Após identificar o carro real:
- Exibe informações do carro identificado
- Mostra grid de miniaturas encontradas no marketplace
- Link para ver mais no Mercado com filtro pré-aplicado

---

## Detalhes Técnicos

### Arquivo: `src/components/scanner/ScannerView.tsx`

**1. Novo estado para modo de captura:**
```tsx
type ScanMode = "collectible" | "real_car";
const [scanMode, setScanMode] = useState<ScanMode>("collectible");
```

**2. Toggle de modo na UI (topo do scanner):**
```tsx
{cameraActive && !isScanning && !capturedImage && (
  <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20">
    <div className="bg-black/40 backdrop-blur-sm rounded-full p-1 flex gap-1">
      <button
        onClick={() => setScanMode("collectible")}
        className={cn(
          "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
          scanMode === "collectible" 
            ? "bg-white text-black" 
            : "text-white/70 hover:text-white"
        )}
      >
        🚗 Carrinho
      </button>
      <button
        onClick={() => setScanMode("real_car")}
        className={cn(
          "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
          scanMode === "real_car" 
            ? "bg-white text-black" 
            : "text-white/70 hover:text-white"
        )}
      >
        🚙 Carro Real
      </button>
    </div>
  </div>
)}
```

**3. Lógica de captura bifurcada:**
```tsx
const capturePhoto = useCallback(async () => {
  // ... código de captura existente ...
  
  if (scanMode === "collectible") {
    // Fluxo atual: analyze-collectible → ResultCarousel
    const { data } = await supabase.functions.invoke("analyze-collectible", ...);
  } else {
    // Novo fluxo: analyze-real-car → RealCarResults
    const { data } = await supabase.functions.invoke("analyze-real-car", ...);
    setRealCarResult(data);
    // Buscar listagens automaticamente
    await searchListingsForCar(data.brand, data.model);
  }
}, [scanMode, ...]);
```

### Nova Edge Function: `supabase/functions/analyze-real-car/index.ts`

```typescript
// Prompt específico para carros reais (não miniaturas)
const systemPrompt = `Você é um especialista em identificação de carros.

Analise a imagem e identifique o carro REAL (tamanho normal, não miniatura).

Responda com JSON:
{
  "identified": true/false,
  "car": {
    "brand": "Marca (ex: Ferrari, Porsche, Toyota)",
    "model": "Modelo (ex: 250 GTO, 911 Turbo, Supra)",
    "year": "Ano ou década aproximada",
    "variant": "Variante se aplicável (ex: GT3 RS, Type R)",
    "bodyStyle": "Tipo de carroceria (Sedan, Coupe, SUV, etc)",
    "color": "Cor do veículo"
  },
  "searchTerms": [
    "termo de busca 1 para encontrar miniatura",
    "termo alternativo",
    "termo com fabricante específico"
  ],
  "confidence": "high" | "medium" | "low"
}`;
```

### Novo Componente: `src/components/scanner/RealCarResults.tsx`

Exibe:
- Card com dados do carro identificado
- Grid de miniaturas encontradas no marketplace (usa `ListingCard`)
- Botões: "Ver Mais no Mercado", "Escanear Outro"

### Arquivo: `src/lib/i18n/translations/pt-BR.ts`

Novas traduções:
```typescript
scanner: {
  // ... existentes ...
  modeCollectible: "Carrinho",
  modeRealCar: "Carro Real",
  identifyingCar: "Identificando veículo...",
  searchingMiniatures: "Buscando miniaturas...",
  carIdentified: "Carro Identificado",
  foundMiniatures: "Miniaturas Encontradas",
  noMiniaturesFound: "Nenhuma miniatura encontrada",
  viewInMarket: "Ver no Mercado",
  scanAnother: "Escanear Outro",
  couldNotIdentify: "Não foi possível identificar o veículo",
  tryDifferentAngle: "Tente capturar de outro ângulo",
}
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/scanner/ScannerView.tsx` | Modificar | Adicionar toggle de modo, lógica bifurcada, estado para resultados de carro real |
| `supabase/functions/analyze-real-car/index.ts` | Criar | Edge function para identificar carros reais |
| `src/components/scanner/RealCarResults.tsx` | Criar | Componente para exibir resultados do carro real + listagens |
| `src/lib/i18n/translations/pt-BR.ts` | Modificar | Adicionar novas strings de tradução |
| `src/lib/i18n/translations/en.ts` | Modificar | Adicionar traduções em inglês (manter consistência) |
| `supabase/config.toml` | Modificar | Registrar nova edge function |

---

## Fluxo de Dados

1. **Usuário seleciona modo "Carro Real"** → `scanMode = "real_car"`
2. **Captura foto** → `analyze-real-car` identifica veículo
3. **Recebe dados do carro** → `{ brand: "Ferrari", model: "F40", ... }`
4. **Busca listagens** → `fetch-listings` com query = `"Ferrari F40 diecast"`
5. **Exibe resultados** → `RealCarResults` mostra carro + grid de miniaturas
6. **Usuário clica em miniatura** → Abre link externo ou detalhes internos

---

## Considerações de UX

- O modo padrão continua sendo "Carrinho" (comportamento atual)
- Toggle discreto mas visível no topo do scanner
- Feedback claro durante cada etapa (identificando → buscando → resultados)
- Se nenhuma miniatura for encontrada, oferecer opção de buscar manualmente no Mercado
