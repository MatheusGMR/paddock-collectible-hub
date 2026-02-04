

## Plano: Corrigir Warnings de Ref no Componente Drawer

### Problema Identificado
Os logs mostram warnings do React sobre components que recebem refs sem usar `forwardRef`:
```
Warning: Function components cannot be given refs. 
Did you mean to use React.forwardRef()?
```

Este é um warning de desenvolvimento (não um erro crítico) que não impede o funcionamento da aplicação, mas deve ser corrigido para seguir boas práticas.

### Solução
Atualizar o componente `Drawer` para usar `React.forwardRef`, permitindo que refs sejam encaminhadas corretamente para o componente primitivo do `vaul`.

### Alterações

**Arquivo:** `src/components/ui/drawer.tsx`

**Mudança:** Refatorar o componente `Drawer` (linhas 6-9) de um function component simples para usar `React.forwardRef`:

```tsx
// De:
const Drawer = ({ shouldScaleBackground = true, ...props }) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);

// Para:
const Drawer = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Root>
>(({ shouldScaleBackground = true, ...props }, ref) => (
  <DrawerPrimitive.Root 
    ref={ref} 
    shouldScaleBackground={shouldScaleBackground} 
    {...props} 
  />
));
```

### Resultado Esperado
- Os warnings de ref desaparecerão do console
- O componente Drawer funcionará corretamente com refs
- Não há mudança no comportamento visual ou funcional

### Observação
Este é apenas um warning de desenvolvimento e não afeta a experiência do usuário em produção. A correção é uma melhoria de qualidade de código.

