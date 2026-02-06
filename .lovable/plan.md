
# Plano de Correção dos Warnings do Build

## Resumo

O build **funcionou com sucesso**, mas há **4 warnings** que devemos corrigir para garantir estabilidade e performance otimizada do app nativo.

---

## Problemas Identificados

| # | Problema | Severidade | Impacto |
|---|----------|------------|---------|
| 1 | Git pull bloqueado | Operacional | Impede sincronização |
| 2 | Peer dependency Capacitor | Baixa | Warning apenas |
| 3 | CSS @import mal posicionado | Média | Pode causar problemas de fonte |
| 4 | Dynamic import misto | Baixa | Afeta code-splitting |
| 5 | Bundle muito grande | Média | Afeta tempo de carregamento |

---

## Correções Propostas

### Correção 1: CSS @import Order

**Arquivo**: `src/index.css`

O `@import` da fonte Google precisa vir **antes** de qualquer outra declaração CSS:

```text
ANTES (linha 1-7):
┌─────────────────────────────────────┐
│ @tailwind base;                     │ ← Linha 1
│ @tailwind components;               │
│ @tailwind utilities;                │
│                                     │
│ /* Paddock Design System */         │
│                                     │
│ @import url('https://fonts...');    │ ← Linha 7 (ERRADO)
└─────────────────────────────────────┘

DEPOIS:
┌─────────────────────────────────────┐
│ @import url('https://fonts...');    │ ← Linha 1 (CORRETO)
│                                     │
│ @tailwind base;                     │
│ @tailwind components;               │
│ @tailwind utilities;                │
│                                     │
│ /* Paddock Design System */         │
└─────────────────────────────────────┘
```

---

### Correção 2: Unificar Imports do Supabase Client

**Arquivos**: `src/lib/analytics.ts` e `src/pages/Auth.tsx`

Converter imports dinâmicos para estáticos (o client é usado em quase todos os lugares):

```typescript
// ANTES (analytics.ts linha 28)
const { supabase } = await import("@/integrations/supabase/client");

// DEPOIS
import { supabase } from "@/integrations/supabase/client";
```

```typescript
// ANTES (Auth.tsx linha 86)
const { data: { session } } = await (await import("@/integrations/supabase/client")).supabase.auth.getSession();

// DEPOIS (usar supabase já importado do contexto ou importar estaticamente)
import { supabase } from "@/integrations/supabase/client";
// ...
const { data: { session } } = await supabase.auth.getSession();
```

---

### Correção 3: Instruções para Git Pull

Para resolver o conflito do git, execute no terminal:

```bash
# Opção A: Descartar mudanças locais no package-lock.json
git checkout -- package-lock.json
git pull origin main

# Opção B: Guardar mudanças temporariamente
git stash
git pull origin main
git stash pop
npm install
```

---

### Sobre os Outros Warnings

**Peer Dependencies do Capacitor**: Este é um warning conhecido porque `@aparajita/capacitor-biometric-auth` ainda não lançou versão compatível com Capacitor 8. O app funciona normalmente em iOS. Para Android, pode precisar de testes adicionais.

**Bundle Size**: Otimização de code-splitting pode ser feita futuramente com `manualChunks` no Vite config, mas não é urgente.

---

## Arquivos a Modificar

1. `src/index.css` - Mover @import para o topo
2. `src/lib/analytics.ts` - Converter para import estático
3. `src/pages/Auth.tsx` - Converter para import estático

---

## Resultado Esperado

Após as correções:
- Build sem warnings de CSS
- Build sem warnings de dynamic import
- Git pull funcionando normalmente
