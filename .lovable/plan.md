
# Plano de Correção: Câmera, Apple Sign-In e Scroll do Mercado

## Resumo dos Problemas Identificados

1. **Câmera não abre automaticamente** - Quando o usuário clica no ícone de scanner, a câmera deveria abrir imediatamente mas fica aguardando um segundo clique
2. **Apple Sign-In não progride** - Após autenticação com Apple, o app não redireciona para a tela principal
3. **Scroll do Mercado limitado** - O scroll infinito não está carregando mais anúncios corretamente

---

## Correção 1: Câmera Automática ao Abrir Scanner

### Problema
O componente `ScannerView` inicia com a câmera desligada e requer que o usuário clique em "Open Camera" manualmente.

### Solução
Iniciar a câmera automaticamente quando o componente for montado.

### Mudanças Técnicas
**Arquivo:** `src/components/scanner/ScannerView.tsx`
- Adicionar `useEffect` para chamar `startCamera()` automaticamente na montagem
- Configurar cleanup adequado para parar a câmera ao desmontar

---

## Correção 2: Redirecionamento após Apple Sign-In

### Problema
Após o usuário autenticar com Apple, a função `onAuthStateChange` detecta a sessão mas o app não redireciona automaticamente porque:
- O `AppContent` verifica `!user` para redirecionar ao `/auth`, mas não redireciona de volta ao `/` quando o usuário está logado
- A página `/auth` não monitora mudanças de estado de autenticação para redirecionar

### Solução
Adicionar lógica de redirecionamento na página `Auth.tsx` quando um usuário já estiver autenticado.

### Mudanças Técnicas
**Arquivo:** `src/pages/Auth.tsx`
- Importar `useEffect` 
- Monitorar o estado `user` do `useAuth()`
- Redirecionar automaticamente para `/` quando `user` existir

---

## Correção 3: Scroll Infinito do Mercado

### Problema
Os logs mostram que o Firecrawl está retornando 0 resultados, então o app deveria estar usando mock data. O problema é:
- A função `getMockListings` tem apenas 12 itens mock
- A paginação funciona mas quando acaba os 12 itens, não há mais conteúdo
- O `IntersectionObserver` pode não estar disparando corretamente

### Solução
1. Expandir a quantidade de dados mock para simular um feed maior
2. Garantir que o observer está funcionando corretamente
3. Adicionar mais variedade de anúncios mock para testes

### Mudanças Técnicas
**Arquivo:** `src/data/mockListings.ts`
- Expandir `mockListings` para pelo menos 30-40 itens
- Adicionar função para gerar listings variados

**Arquivo:** `src/components/mercado/ListingFeed.tsx`
- Verificar configuração do IntersectionObserver
- Ajustar threshold se necessário

---

## Sequência de Implementação

1. Corrigir abertura automática da câmera (maior impacto na UX)
2. Corrigir redirecionamento do Apple Sign-In
3. Expandir mock data e verificar scroll infinito

---

## Detalhes Técnicos

### ScannerView.tsx - Auto-start Camera
```typescript
// Adicionar useEffect para iniciar câmera automaticamente
useEffect(() => {
  startCamera();
  return () => stopCamera();
}, []);
```

### Auth.tsx - Redirect quando logado
```typescript
// Adicionar useEffect para redirecionar usuário autenticado
useEffect(() => {
  if (user) {
    navigate("/", { replace: true });
  }
}, [user, navigate]);
```

### mockListings.ts - Mais dados
```typescript
// Gerar mais listings programaticamente
const generateMoreListings = (): Listing[] => {
  // Criar variações baseadas nos existentes
  // para ter 30-40 itens no feed
};
```
