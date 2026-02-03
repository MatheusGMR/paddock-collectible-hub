

# Plano: Corrigir Erros de UUID e Safe-Area no iOS

## Diagnóstico dos Problemas

### Problema 1: Erro de UUID nos Likes (Logs do Xcode)
```
Error checking like: {"code":"22P02","message":"invalid input syntax for type uuid: \"2\""}
```

**Causa raiz identificada:**
- O `PostCard` chama `hasLikedPost(post.id)` para verificar se o usuário curtiu o post
- Quando não há posts reais no banco, o app exibe **mock posts** como fallback (IDs: "1", "2", "3", "4")
- Esses IDs mock são strings numéricas simples, **não UUIDs válidos**
- O banco de dados espera UUIDs no formato `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Ao tentar consultar `post_likes` com ID "2", o Postgres retorna erro 22P02

**Código problemático (Index.tsx, linhas 59-65):**
```typescript
const displayPosts = posts.length > 0 ? posts : mockPosts.map(p => ({
  ...p,
  user: { ...p.user, id: undefined },
  // post.id continua sendo "1", "2", "3", "4" - não é UUID!
}));
```

**Código que falha (PostCard.tsx, linhas 50-54):**
```typescript
useEffect(() => {
  if (user && post.id) {
    hasLikedPost(post.id).then(setLiked); // Chama API com ID "2" → ERRO
  }
}, [user, post.id]);
```

---

### Problema 2: Safe-Area não funcionando no App Nativo

**Possíveis causas:**
1. **Cache do WebView nativo** - O Capacitor pode estar servindo uma versão antiga do CSS
2. **Configuração do Capacitor** - O arquivo `capacitor.config.json` não existe no projeto Lovable
3. **Viewport/SafeArea do WKWebView** - Necessário configurar corretamente no iOS nativo

**Observação importante:** 
O Capacitor precisa ser inicializado localmente após exportar o projeto para Git. Não existe `capacitor.config.json` no repositório do Lovable porque o Capacitor é configurado localmente após `npx cap init`.

---

## Plano de Correção

### Correção 1: Evitar chamadas de API para mock posts

**Arquivo:** `src/components/feed/PostCard.tsx`

**Alteração:** Verificar se o ID é um UUID válido antes de chamar `hasLikedPost()`

```typescript
// Função helper para validar UUID
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// No useEffect:
useEffect(() => {
  if (user && post.id && isValidUUID(post.id)) {
    hasLikedPost(post.id).then(setLiked);
  }
}, [user, post.id]);
```

**Também aplicar a mesma validação:**
- Na função `handleLike()` antes de chamar `likePost()`

---

### Correção 2: Documentar passos corretos para build iOS com safe-area

O safe-area CSS está correto no código. O problema é provavelmente **cache do WebView** ou **configuração incorreta do viewport no iOS**.

**Passos necessários após qualquer mudança de CSS:**

1. `git pull` - baixar as últimas alterações
2. `npm run build` - gerar novo bundle de produção
3. `npx cap sync` - sincronizar o build com o projeto iOS
4. No Xcode: **Product → Clean Build Folder** (⌘⇧K)
5. Deletar o app do simulador/device
6. Build and Run novamente

**Verificação adicional no Xcode:**
- Confirmar que o `index.html` tem a meta tag do viewport com `viewport-fit=cover`:
  ```html
  <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  ```

---

### Correção 3 (Opcional): Adicionar meta tag viewport-fit se não existir

**Arquivo:** `index.html`

Garantir que a meta tag viewport inclua `viewport-fit=cover` para que o iOS respeite os safe-area insets.

---

## Resumo das Alterações de Código

| Arquivo | Alteração |
|---------|-----------|
| `src/components/feed/PostCard.tsx` | Adicionar validação de UUID antes de chamar APIs do banco |
| `index.html` | Verificar/adicionar `viewport-fit=cover` na meta tag viewport |

---

## Impacto Esperado

- ✅ Erros "invalid input syntax for type uuid" eliminados
- ✅ Mock posts funcionam sem erros de console
- ✅ Safe-area respeitado após clean build completo no Xcode

---

## Seção Técnica: Detalhes da Implementação

### Validação de UUID (PostCard.tsx)

```typescript
// Antes do componente, adicionar função helper:
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// Linha ~50-54: Modificar useEffect
useEffect(() => {
  // Só consulta likes se for um UUID válido (posts reais, não mock)
  if (user && post.id && isValidUUID(post.id)) {
    hasLikedPost(post.id).then(setLiked);
  }
}, [user, post.id]);

// Linha ~56-72: Modificar handleLike
const handleLike = async () => {
  // Não permitir like em mock posts
  if (isLiking || !user || !isValidUUID(post.id)) return;
  // ... resto do código
};
```

### Meta Tag Viewport (index.html)

```html
<meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

