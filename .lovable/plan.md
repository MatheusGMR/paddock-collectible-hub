
# Plano: Ajustar Cor de Fundo do Perfil

## Problema Identificado

No arquivo `src/components/profile/ProfileHeader.tsx` (linha 71), a seção de informações do perfil usa `bg-black` (preto puro `#000`), enquanto todas as outras páginas do app usam `bg-background` - que é definido como `hsl(220, 22%, 7%)`, um preto azulado muito sutil que faz parte da identidade visual premium do Paddock.

## Solução

Alterar a classe CSS de `bg-black` para `bg-background` para manter a consistência visual.

## Alteração

**Arquivo:** `src/components/profile/ProfileHeader.tsx`

| Linha | Antes | Depois |
|-------|-------|--------|
| 71 | `<div className="border-b border-border bg-black">` | `<div className="border-b border-border bg-background">` |

---

## Detalhes Técnicos

A variável CSS `--background` está definida em `src/index.css`:
```css
--background: 220 22% 7%;
```

Isso resulta em `hsl(220, 22%, 7%)` - um tom de preto com um leve toque azulado, que é o padrão usado em:
- Feed (`Index.tsx`)
- Mercado/Notícias (`Mercado.tsx`)
- Scanner (`Scanner.tsx`)
- Headers de todas as páginas

A mudança garante que o perfil siga o mesmo padrão visual.
