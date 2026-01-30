
# Plano: Corrigir Navegação Inferior para Usar Traduções

## Problema Identificado
O componente `BottomNav.tsx` está usando textos fixos em inglês ("Home", "Alerts", "Profile") em vez de usar o sistema de tradução (i18n) do app. Isso faz com que os rótulos da navegação apareçam sempre em inglês, independente do idioma do usuário.

## Solução

### 1. Atualizar o Componente BottomNav
Modificar `src/components/layout/BottomNav.tsx` para:
- Importar e usar o hook `useLanguage()` 
- Substituir as strings fixas pelas traduções dinâmicas

**De:**
```tsx
const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: ShoppingBag, label: "Mercado", path: "/mercado" },
  { icon: Camera, label: "Scan", path: "/scanner", isCenter: true },
  { icon: Bell, label: "Alerts", path: "/notifications" },
  { icon: User, label: "Profile", path: "/profile" },
];
```

**Para:**
```tsx
// Usar chaves de tradução e buscar dinamicamente
const navItems = [
  { icon: Home, labelKey: "home", path: "/" },
  { icon: ShoppingBag, labelKey: "market", path: "/mercado" },
  { icon: Camera, labelKey: "scanner", path: "/scanner", isCenter: true },
  { icon: Bell, labelKey: "notifications", path: "/notifications" },
  { icon: User, labelKey: "profile", path: "/profile" },
];
// E usar t.nav[item.labelKey] para exibir
```

### 2. Manter "Home" Conforme Solicitado
Conforme seu pedido, vou manter "Home" em ambos os idiomas:
- Atualizar `src/lib/i18n/translations/pt-BR.ts`: mudar `home: "Início"` para `home: "Home"`

### 3. Resultado Final
| Aba | Atual (fixo) | Português (após) | Inglês (após) |
|-----|--------------|------------------|---------------|
| Home | Home | Home | Home |
| Mercado | Mercado | Mercado | Market |
| Scanner | Scan | Scanner | Scanner |
| Alerts | Alerts | Alertas | Notifications |
| Profile | Profile | Perfil | Profile |

---

## Detalhes Técnicos

### Arquivos a Modificar
1. **`src/components/layout/BottomNav.tsx`**
   - Adicionar import do `useLanguage`
   - Criar os navItems usando chaves de tradução
   - Usar `t.nav[labelKey]` para exibir o texto

2. **`src/lib/i18n/translations/pt-BR.ts`**
   - Mudar `home: "Início"` → `home: "Home"` (manter em inglês conforme pedido)
   - Mudar `notifications: "Notificações"` → `notifications: "Alertas"` (para ficar mais curto na UI)

3. **`src/lib/i18n/translations/en.ts`** (opcional)
   - Verificar se precisa ajustes de consistência
