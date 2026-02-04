
# Plano: Melhorar Exibição do Resultado do Scanner

## Análise da Situação Atual

### O que já funciona corretamente:
- **Na coleção**: A imagem salva é `result.croppedImage` (recorte exato do carro)
- **Em publicações**: Usaria a mesma `image_url` recortada
- Isso evita o problema de imagens repetidas quando há múltiplos carros

### O que precisa melhorar:
- **No resultado do scanner**: Mostrar apenas o recorte isolado sem contexto é confuso
- O usuário não sabe qual carro da foto original foi identificado

## Solução: Duas Imagens - Contexto + Recorte

Mostrar no card de resultado:
1. **Foto original com bounding box** - para contexto visual (qual carro foi identificado)
2. **Manter recorte para salvar** - a imagem salva continua sendo a `croppedImage`

```text
┌─────────────────────────────────────────┐
│         FOTO ORIGINAL COMPLETA          │
│    ┌────────────────┐                   │
│    │  ◈ CARRINHO ◈  │← Bounding box     │
│    │   DESTACADO    │   animado         │
│    └────────────────┘                   │
│       [BMW M3 • 1992]                   │
└─────────────────────────────────────────┘
│                                         │
│  ── Dados do Colecionável ──            │
│  Hot Wheels • 1:64 • Azul               │
│                                         │
└─────────────────────────────────────────┘
```

## Arquivos a Modificar

### 1. `src/components/scanner/ScannerView.tsx`
Passar a imagem original para o ResultCarousel:
```typescript
<ResultCarousel
  results={analysisResults}
  originalImage={capturedImage}  // ← Nova prop
  onAddToCollection={handleAddToCollection}
  // ...
/>
```

### 2. `src/components/scanner/ResultCarousel.tsx`
Criar componente `HighlightedImage` e substituir a exibição do recorte isolado:

```typescript
// Nova interface
interface ResultCarouselProps {
  results: AnalysisResult[];
  originalImage?: string;  // Foto original completa
  // ... resto das props
}

// Novo componente para exibir foto com destaque
const HighlightedImage = ({ 
  originalImage, 
  boundingBox, 
  carName, 
  carYear 
}: HighlightedImageProps) => (
  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black">
    {/* Foto original */}
    <img
      src={originalImage}
      alt="Captura original"
      className="w-full h-full object-cover"
    />
    
    {/* Overlay escurecido */}
    {boundingBox && (
      <div className="absolute inset-0 bg-black/50 pointer-events-none">
        {/* Área do carro "recortada" (transparente) */}
        <div 
          className="absolute bg-transparent"
          style={{
            left: `${boundingBox.x}%`,
            top: `${boundingBox.y}%`,
            width: `${boundingBox.width}%`,
            height: `${boundingBox.height}%`,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            borderRadius: '12px'
          }}
        />
      </div>
    )}
    
    {/* Borda animada no carro */}
    {boundingBox && (
      <div 
        className="absolute border-2 border-primary rounded-xl animate-pulse-subtle shadow-glow"
        style={{
          left: `${boundingBox.x}%`,
          top: `${boundingBox.y}%`,
          width: `${boundingBox.width}%`,
          height: `${boundingBox.height}%`,
        }}
      >
        {/* Badge com nome */}
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2">
          <div className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium whitespace-nowrap">
            {carName} • {carYear}
          </div>
        </div>
      </div>
    )}
  </div>
);
```

### 3. `src/index.css`
Adicionar animações para o destaque visual:
```css
@keyframes pulse-subtle {
  0%, 100% { 
    box-shadow: 0 0 0 0 hsl(var(--primary) / 0.4);
  }
  50% { 
    box-shadow: 0 0 20px 4px hsl(var(--primary) / 0.2);
  }
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s ease-in-out infinite;
}

.shadow-glow {
  box-shadow: 0 0 15px 2px hsl(var(--primary) / 0.3);
}
```

## Fluxo Visual Final

```text
ANTES (confuso):              DEPOIS (com contexto):
┌──────────────┐              ┌────────────────────────┐
│  [Recorte    │              │    FOTO ORIGINAL       │
│   isolado    │              │ ┌────────┐ ┌────────┐  │
│   do carro]  │              │ │ 🚗 ←───┼─┼─ esse! │  │
│              │              │ └────────┘ └────────┘  │
└──────────────┘              │    [BMW M3 • 1992]     │
                              └────────────────────────┘

│ Hot Wheels 1:64             │ Hot Wheels 1:64        │
│ Azul                        │ Azul                   │
```

## O que NÃO muda

- **Imagem salva na coleção**: Continua sendo `croppedImage` (recorte exato)
- **Imagem em publicações**: Usaria a mesma `image_url` recortada do banco
- **Detecção de duplicados**: Continua funcionando igual

## Fallback quando não há bounding box

Se `boundingBox` não estiver disponível (item único sem coordenadas), mostrar:
- A foto original completa sem overlay
- Ou a `croppedImage` como fallback (comportamento atual)

## Benefícios

1. **Contexto claro**: Usuário vê exatamente qual carro foi identificado na foto
2. **Profissional**: Similar a apps como Google Lens, Shazam visual
3. **Múltiplos carros**: Fica óbvio qual carro está sendo processado
4. **Coleção limpa**: Imagens individuais recortadas, sem repetição
