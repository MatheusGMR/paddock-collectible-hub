
# Plano: Corrigir Card de Resultados do Scanner (iOS)

## Diagnóstico do Problema

O card de resultados não está aparecendo no iOS após a análise do scanner. O usuário vê apenas:
- A foto capturada (embaçada)
- O botão X no canto superior direito
- **Nenhum card de resultados**

### Causa Raiz
O componente `ResultCarousel` atualmente usa `DrawerPrimitive` do vaul com a configuração:
```tsx
<DrawerPrimitive.Root 
  open={true}
  snapPoints={["15%", "85%"]}
  modal={false}
  dismissible={false}
  fixed={true}
>
```

Esta combinação de `modal={false}` + snap points tem **problemas conhecidos no iOS** (GitHub issue #349). O drawer não renderiza corretamente sem um Trigger explícito, especialmente em WebViews nativas.

## Solução Proposta

Abandonar o uso do Drawer do vaul para o contexto do scanner e implementar um **card fixo com animação CSS simples**, que é mais confiável em todas as plataformas.

### Mudanças Técnicas

**Arquivo: `src/components/scanner/ResultCarousel.tsx`**

1. **Remover** a dependência do `DrawerPrimitive` do vaul
2. **Substituir** por um `<div>` com posicionamento fixo e animações CSS
3. **Manter** a funcionalidade de snap points através de um state simples (`expanded` / `collapsed`)
4. **Implementar** gesture de arrastar via touch events nativos (simples)

### Estrutura do Novo Card

```text
┌─────────────────────────────────────────┐
│  ═══════  (drag handle)                 │  ← Touch area para arrastar
│  Ferrari 250 GTO                        │  ← Título sempre visível
│  Hot Wheels • 1:64 • 1962               │
├─────────────────────────────────────────┤
│  [Conteúdo rolável quando expandido]    │  ← max-height: 65vh ou 15vh
│  - Imagem destacada                     │
│  - Índice de preço                      │
│  - Dados colapsáveis                    │
│  - Botões de ação                       │
└─────────────────────────────────────────┘
```

### Lógica de Snap Points (CSS/State)

```tsx
// State simples para controlar expansão
const [isExpanded, setIsExpanded] = useState(true);

// Classes CSS baseadas no estado
className={cn(
  "fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-[28px] transition-all duration-300",
  isExpanded ? "max-h-[85vh]" : "max-h-[15vh]"
)}
```

### Gesture de Arrastar (Simplificado)

```tsx
// Detectar direção do swipe no drag handle
const handleDragEnd = (e: TouchEvent) => {
  const deltaY = e.changedTouches[0].clientY - startY;
  if (deltaY > 50) setIsExpanded(false);  // Swipe down = minimizar
  if (deltaY < -50) setIsExpanded(true);  // Swipe up = expandir
};
```

## Benefícios

1. **Compatibilidade iOS garantida** - Sem dependência de bibliotecas com bugs conhecidos
2. **Performance melhor** - CSS transitions nativas vs JavaScript animations
3. **Código mais simples** - Menos dependências, mais fácil de manter
4. **Comportamento previsível** - Funciona igual em web e nativo

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/scanner/ResultCarousel.tsx` | Refatorar completamente para usar div fixo com CSS |

## Cronograma Estimado

Esta é uma refatoração focada em um único componente. A lógica interna (navegação entre carros, adicionar à coleção, etc.) permanece inalterada - apenas a "casca" do drawer muda.
