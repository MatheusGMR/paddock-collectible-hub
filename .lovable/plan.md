

# Plano: Aumentar Espaçamento entre Header e Foto de Perfil

## Problema
A linha inferior do header (separador) está cortando visualmente o topo do círculo da foto de perfil. O espaçamento atual (`pt-4` = 16px) não é suficiente.

## Solução
Aumentar o padding superior da seção de informações do perfil de `pt-4` para `pt-6` (24px), criando mais espaço entre a borda do header e o avatar.

## Alteração

**Arquivo:** `src/components/profile/ProfileHeader.tsx`

**Linha 74** - Alterar:
```tsx
// De:
<div className="px-4 pb-6 pt-4">

// Para:
<div className="px-4 pb-6 pt-6">
```

## Detalhes Técnicos
- `pt-4` = 16px de padding superior
- `pt-6` = 24px de padding superior (aumento de 8px)
- O avatar tem `h-20 w-20` (80px), então 24px de espaço superior garante que a linha não corte o círculo

## Resultado Esperado
A linha separadora do header ficará com espaçamento adequado, sem cortar visualmente o círculo da foto de perfil.

