
# Plano: Corrigir Reinício Automático do Onboarding

## Problema Identificado

O onboarding está reiniciando automaticamente durante a leitura porque:

1. **Verificação periódica de assinatura**: O `SubscriptionContext` executa `checkSubscription()` a cada 60 segundos (linha 154-156), o que altera os estados `status` e `isNewUser`
2. **Dependências do useEffect**: O `useEffect` no `SubscriptionFlow` depende de `isNewUser` e `status`, fazendo com que seja re-executado quando esses valores mudam
3. **Condição de corrida**: Durante o onboarding, se a verificação periódica retornar `isNewUser: true` e `status: "none"`, a condição pode disparar novamente mesmo com `hasCheckedOnboarding: true`

## Solução

Garantir que uma vez iniciado o onboarding, ele não seja interrompido até ser explicitamente concluído.

---

## Alterações Técnicas

### 1. Modificar `src/App.tsx` - Componente SubscriptionFlow

**Problema atual:**
```typescript
useEffect(() => {
  if (!authLoading && !subLoading && user && !hasCheckedOnboarding) {
    // ... lógica que pode ser re-executada
  }
}, [authLoading, subLoading, user, isNewUser, status, hasCheckedOnboarding, ...]);
```

**Solução:**
- Adicionar uma flag `isOnboardingInProgress` para bloquear re-verificações enquanto o onboarding está ativo
- Mover a verificação de `hasCheckedOnboarding` para fora das dependências do efeito
- Usar um `useRef` para evitar múltiplas execuções do mesmo efeito

```typescript
const hasCheckedRef = useRef(false);
const [isOnboardingInProgress, setIsOnboardingInProgress] = useState(false);

useEffect(() => {
  // Se já está no onboarding, não fazer nada
  if (isOnboardingInProgress) return;
  
  // Se já verificou, não verificar novamente
  if (hasCheckedRef.current) return;
  
  if (!authLoading && !subLoading && user) {
    hasCheckedRef.current = true;
    
    const alreadyCompleted = hasCompletedOnboardingBefore(user.id);
    
    if (alreadyCompleted) {
      markOnboardingComplete();
    } else if (isNewUser && status === "none") {
      setIsOnboardingInProgress(true);
      setShowOnboarding(true);
    } else {
      markUserOnboardingComplete(user.id);
      markOnboardingComplete();
    }
  }
}, [authLoading, subLoading, user, isNewUser, status, ...]);

// Reset ref quando usuário muda
useEffect(() => {
  if (!user) {
    hasCheckedRef.current = false;
    setIsOnboardingInProgress(false);
    setShowOnboarding(false);
  }
}, [user]);
```

### 2. Proteção adicional no estado `showOnboarding`

Garantir que `showOnboarding` só seja alterado de `true` para `false` quando o usuário explicitamente completar ou pular o onboarding:

```typescript
// Apenas essas funções podem desativar o onboarding:
const handleSkipOnboarding = async () => {
  // ... após sucesso
  setIsOnboardingInProgress(false);
  setShowOnboarding(false);
};

const handleStartTrial = async () => {
  // ... após redirecionar para checkout
  setIsOnboardingInProgress(false);
};
```

---

## Resumo das Mudanças

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Adicionar `useRef` para controle de verificação única e flag `isOnboardingInProgress` para bloquear re-verificações durante o fluxo |

## Resultado Esperado

- O onboarding só aparecerá uma vez para novos usuários
- Uma vez iniciado, o onboarding não será interrompido ou reiniciado pela verificação periódica de assinatura
- O fluxo só será encerrado quando o usuário completar ou pular explicitamente
