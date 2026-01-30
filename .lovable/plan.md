
# Plano: Flash de Captura + Marca d'água Paddock

## Resumo
Adicionar feedback visual de flash ao capturar foto e incluir uma marca d'água semitransparente com o logo Paddock no topo da tela do scanner.

---

## Funcionalidades

### 1. Efeito de Flash na Captura
Quando o usuário tocar no botão para capturar uma foto, a tela piscará rapidamente em branco (como um flash de câmera), proporcionando feedback visual imediato.

**Comportamento:**
- Flash aparece por ~150ms
- Animação suave de fade-out
- Não interfere na captura da foto

### 2. Marca d'água Paddock
Logo semitransparente posicionado no topo central da tela do scanner, sempre visível durante o uso da câmera.

**Aparência:**
- Wordmark "PADDOCK" completo
- Opacidade ~30% (semitransparente)
- Posicionado no topo central
- Tamanho discreto (~24px de altura)

---

## Resultado Visual

```text
┌─────────────────────────────────┐
│  [←]      PADDOCK (30%)     [X] │  ← Logo semitransparente
│                                 │
│  ┌─                         ─┐  │
│  │                           │  │
│  │                           │  │
│  │      [Câmera/Preview]     │  │
│  │                           │  │
│  │                           │  │
│  └─                         ─┘  │
│                                 │
│       ● toque para capturar     │
│            ( ○ )                │  ← Botão
└─────────────────────────────────┘

          ┌───────────────┐
          │  FLASH BRANCO │  ← Aparece ~150ms ao capturar
          │   (fade-out)  │
          └───────────────┘
```

---

## Detalhes Técnicos

### Arquivo: `src/components/scanner/ScannerView.tsx`

**1. Estado para controle do flash:**
```tsx
const [showFlash, setShowFlash] = useState(false);
```

**2. Ativar flash na função `capturePhoto`:**
```tsx
const capturePhoto = useCallback(async () => {
  // Trigger flash effect
  setShowFlash(true);
  setTimeout(() => setShowFlash(false), 150);
  
  // ... resto do código de captura
}, [...]);
```

**3. Adicionar overlay de flash na UI:**
```tsx
{/* Flash effect overlay */}
{showFlash && (
  <div className="absolute inset-0 bg-white z-50 animate-fade-out pointer-events-none" />
)}
```

**4. Adicionar marca d'água no topo:**
```tsx
{/* Paddock watermark */}
{cameraActive && !isScanning && !capturedImage && (
  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
    <PaddockLogo 
      variant="wordmark" 
      size={24} 
      className="opacity-30"
    />
  </div>
)}
```

### Arquivo: `src/index.css` (ou tailwind.config.ts)

**Adicionar animação de fade-out para o flash:**
```css
@keyframes fade-out-flash {
  from { opacity: 1; }
  to { opacity: 0; }
}

.animate-fade-out {
  animation: fade-out-flash 150ms ease-out forwards;
}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/scanner/ScannerView.tsx` | Adicionar estado do flash, trigger na captura, overlay de flash e marca d'água |
| `src/index.css` ou `tailwind.config.ts` | Adicionar keyframe de animação fade-out para o flash |
