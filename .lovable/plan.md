

# Plano: Traduzir Toda a Plataforma para Português

## Problema Identificado

Diversos componentes e páginas da plataforma possuem textos hardcoded em inglês, mesmo com o sistema de i18n já implementado. O idioma padrão deveria ser português (PT-BR).

---

## Arquivos com Textos Hardcoded em Inglês

### Páginas Principais

| Arquivo | Textos em Inglês |
|---------|-----------------|
| `src/pages/Auth.tsx` | "Welcome back", "Create account", "Sign in to your account", "Join the collector community", "Username", "Email", "Password", "Sign In", "Create Account", "or", "Continue with Google", "Continue with Apple", "Don't have an account?", "Already have an account?", "Sign up", "Sign in" |
| `src/pages/NotFound.tsx` | "Oops! Page not found", "Return to Home" |
| `src/pages/Notifications.tsx` | "Notifications" (header) |
| `src/pages/Profile.tsx` | "Sign Out", "No posts yet", "Scan items to add to your collection", "Your collection is empty", "Use the scanner to add items", "User", "Collector at Paddock" |

### Componentes

| Arquivo | Textos em Inglês |
|---------|-----------------|
| `src/components/scanner/ScoreHero.tsx` | "Toque para ver detalhes do índice" (já em PT, ok) |
| `src/components/scanner/ResultCarousel.tsx` | "Origem:", "Fato Histórico", "Notas" (já em PT, ok), "N/A" |
| `src/components/scanner/MusicSuggestion.tsx` | "Música para Ouvir" (já em PT, ok) |
| `src/components/collection/CollectibleDetailCard.tsx` | "Detalhes do Item", "Dados do Carro Real", "Dados do Colecionável", "Marca", "Modelo", "Ano", "Fabricante", "Escala", "Série", "Condição", "Origem", "Ano do Modelo", "Notas", "Fato Histórico", "Música para Ouvir", "Fotos do Veículo Real" (já em PT, ok) |

---

## Solução

### 1. Atualizar Arquivos de Tradução

Adicionar novas chaves ao arquivo `pt-BR.ts` e `en.ts` para cobrir todos os textos faltantes.

### 2. Atualizar Componentes para Usar o Sistema i18n

Importar `useLanguage()` e substituir textos hardcoded pelas chaves de tradução.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/lib/i18n/translations/pt-BR.ts` | Adicionar novas chaves de tradução |
| `src/lib/i18n/translations/en.ts` | Adicionar mesmas chaves em inglês |
| `src/pages/Auth.tsx` | Usar `useLanguage()` para todos os textos |
| `src/pages/NotFound.tsx` | Usar `useLanguage()` para todos os textos |
| `src/pages/Notifications.tsx` | Usar `useLanguage()` para header |
| `src/pages/Profile.tsx` | Usar `useLanguage()` para todos os textos |

---

## Detalhes Técnicos

### Novas Chaves de Tradução

```typescript
// Adicionar em auth:
auth: {
  // ... existentes
  username: "Nome de usuário",
  joinCommunity: "Junte-se à comunidade de colecionadores",
  continueWithGoogle: "Continuar com Google",
  continueWithApple: "Continuar com Apple",
}

// Adicionar em errors:
errors: {
  // ... existentes
  pageNotFound: "Ops! Página não encontrada",
  returnHome: "Voltar para o Início",
  usernameRequired: "Nome de usuário é obrigatório",
  errorOccurred: "Ocorreu um erro",
  failedGoogleSignIn: "Falha ao entrar com Google",
  failedAppleSignIn: "Falha ao entrar com Apple",
}

// Adicionar em profile:
profile: {
  // ... existentes
  noPostsYet: "Nenhum post ainda",
  scanItemsToAdd: "Escaneie itens para adicionar à sua coleção",
  emptyCollection: "Sua coleção está vazia",
  useScannerToAdd: "Use o scanner para adicionar itens",
  defaultBio: "Colecionador no Paddock",
}
```

### Exemplo de Atualização do Auth.tsx

```tsx
// Antes
<h1 className="text-2xl font-semibold">
  {isLogin ? "Welcome back" : "Create account"}
</h1>

// Depois
const { t } = useLanguage();

<h1 className="text-2xl font-semibold">
  {isLogin ? t.auth.welcomeBack : t.auth.createAccount}
</h1>
```

### Exemplo de Atualização do NotFound.tsx

```tsx
// Antes
<p>Oops! Page not found</p>
<a href="/">Return to Home</a>

// Depois
const { t } = useLanguage();

<p>{t.errors.pageNotFound}</p>
<a href="/">{t.errors.returnHome}</a>
```

---

## Lista Completa de Textos a Traduzir

### Auth.tsx
| Inglês | Português |
|--------|-----------|
| Welcome back | Bem-vindo de volta |
| Create account | Criar conta |
| Sign in to your account | Entre na sua conta |
| Join the collector community | Junte-se à comunidade de colecionadores |
| Username | Nome de usuário |
| Email | E-mail |
| Password | Senha |
| Sign In | Entrar |
| Create Account | Criar Conta |
| or | ou |
| Continue with Google | Continuar com Google |
| Continue with Apple | Continuar com Apple |
| Don't have an account? | Não tem uma conta? |
| Already have an account? | Já tem uma conta? |
| Sign up | Cadastre-se |
| Sign in | Entre |
| Username is required | Nome de usuário é obrigatório |
| An error occurred | Ocorreu um erro |
| Failed to sign in with Google | Falha ao entrar com Google |
| Failed to sign in with Apple | Falha ao entrar com Apple |
| Welcome to Paddock | Bem-vindo ao Paddock |

### NotFound.tsx
| Inglês | Português |
|--------|-----------|
| Oops! Page not found | Ops! Página não encontrada |
| Return to Home | Voltar para o Início |

### Profile.tsx
| Inglês | Português |
|--------|-----------|
| Sign Out | Sair |
| No posts yet | Nenhum post ainda |
| Scan items to add to your collection | Escaneie itens para adicionar à sua coleção |
| Your collection is empty | Sua coleção está vazia |
| Use the scanner to add items | Use o scanner para adicionar itens |
| User | Usuário |
| Collector at Paddock | Colecionador no Paddock |

### Notifications.tsx
| Inglês | Português |
|--------|-----------|
| Notifications | Notificações |

---

## Resumo

| Problema | Solução |
|----------|---------|
| Textos hardcoded em inglês | Usar sistema i18n existente |
| Faltam chaves de tradução | Adicionar novas chaves em pt-BR.ts e en.ts |
| Componentes não usam useLanguage() | Importar e utilizar o hook |

