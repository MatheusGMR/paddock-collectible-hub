
# Plano de Correção: App iOS Não Carrega (Erro de Rede)

## Diagnóstico do Problema

O app iOS nativo está carregando corretamente (`WebView loaded`, `WEB_BUILD_ID: 20260205002600`), porém **todas as requisições de rede estão falhando** com `TypeError: Load failed`. Isso afeta:

- Posts do feed
- Curiosidades em destaque
- Verificação de assinatura (check-subscription)
- Analytics

### Causa Raiz Identificada

O problema ocorre porque o app está configurado para rodar **em modo offline (build local)** no Capacitor (`server` está comentado no `capacitor.config.ts`), mas a aplicação tenta fazer requisições para:
- `tsnlbfjltskscgyidgdt.supabase.co` (backend)
- Edge Functions

No iOS, quando o Capacitor roda de `capacitor://localhost` (modo offline/build local), as requisições de rede podem falhar por diversos motivos:
1. **Problema de conectividade de rede** no dispositivo
2. **Cache corrompido** no WKWebView
3. **Problema de ATS (App Transport Security)** para domínios externos
4. **Build desatualizado** - o bundle `dist` pode estar antigo

---

## Solução Proposta

### Passo 1: Verificar e Atualizar o Build

O primeiro passo é garantir que o dispositivo iOS está rodando a versão mais recente do código.

**Ação manual necessária:**
1. No terminal do projeto local, executar:
   ```bash
   npm run build
   npx cap sync ios
   ```
2. Reabrir o Xcode e fazer um "Clean Build Folder" (Cmd + Shift + K)
3. Reinstalar o app no dispositivo

### Passo 2: Habilitar o Modo de Desenvolvimento (Hot Reload)

Para testes, recomendo habilitar o servidor de desenvolvimento no `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'app.lovable.ec82142056a94147adde54a8d514aaac',
  appName: 'paddock-collectible-hub',
  webDir: 'dist',
  ios: {
    backgroundColor: '#00000000',
  },
  // DESCOMENTAR para desenvolvimento/testes:
  server: {
    url: 'https://ec821420-56a9-4147-adde-54a8d514aaac.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
};
```

Isso fará o app carregar diretamente do servidor Lovable, resolvendo problemas de build desatualizado.

### Passo 3: Adicionar Tratamento de Erro de Rede Robusto

Vou adicionar um sistema de detecção de conectividade e retry para melhorar a experiência do usuário quando houver problemas de rede.

**Arquivos a modificar:**
1. `src/contexts/SubscriptionContext.tsx` - Adicionar retry logic e fallback
2. `src/hooks/useFeedPosts.ts` - Adicionar retry e mensagem amigável
3. `src/hooks/useFeaturedCuriosity.ts` - Adicionar retry e tratamento de erro

### Passo 4: Criar Componente de Status de Rede

Criar um componente que detecta quando o dispositivo está offline ou quando há problemas de conectividade com o backend:

**Novo arquivo:** `src/components/NetworkStatus.tsx`
- Detectar estado offline via `navigator.onLine`
- Mostrar banner quando houver problemas de rede
- Oferecer botão de retry

---

## Código a Implementar

### 1. Adicionar Retry Logic no SubscriptionContext

```typescript
// Adicionar retry com exponential backoff
const checkSubscription = useCallback(async (retries = 3) => {
  if (!user) {
    setState(prev => ({ ...prev, isLoading: false }));
    return;
  }

  try {
    setState(prev => ({ ...prev, isLoading: true }));
    
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.access_token) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const { data, error } = await supabase.functions.invoke("check-subscription", {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (error) {
      // Se falhou e ainda tem retries, tentar novamente
      if (retries > 0 && error.message?.includes("Failed to fetch")) {
        console.log(`[Subscription] Retrying... (${retries} attempts left)`);
        await new Promise(r => setTimeout(r, 1000 * (4 - retries)));
        return checkSubscription(retries - 1);
      }
      console.error("Error checking subscription:", error);
      // Fallback: manter usuário logado sem bloquear
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    setState({
      status: data.status || "none",
      isNewUser: data.is_new_user ?? true,
      trialEndsAt: data.trial_ends_at || null,
      daysLeft: data.days_left || 0,
      subscriptionEnd: data.subscription_end || null,
      isLoading: false,
    });
  } catch (err) {
    console.error("Failed to check subscription:", err);
    setState(prev => ({ ...prev, isLoading: false }));
  }
}, [user]);
```

### 2. Criar NetworkStatus Component

```typescript
// src/components/NetworkStatus.tsx
import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const NetworkStatus = ({ onRetry }: { onRetry?: () => void }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive/90 text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm font-medium">Sem conexão com a internet</span>
      </div>
      {onRetry && (
        <Button size="sm" variant="ghost" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
```

### 3. Adicionar Retry nos Hooks de Feed

```typescript
// Em useFeedPosts.ts - melhorar tratamento de erro
} catch (err) {
  // Detectar erro de rede específico
  const isNetworkError = err instanceof Error && 
    (err.message.includes("Load failed") || err.message.includes("Failed to fetch"));
  
  console.error("Error fetching posts:", err);
  setError(isNetworkError 
    ? "Verifique sua conexão com a internet" 
    : "Erro ao carregar posts"
  );
}
```

---

## Resumo das Ações

| Etapa | Ação | Tipo |
|-------|------|------|
| 1 | Rebuild do projeto (`npm run build && npx cap sync ios`) | Manual |
| 2 | Limpar cache do Xcode (Clean Build Folder) | Manual |
| 3 | Adicionar retry logic no SubscriptionContext | Código |
| 4 | Criar componente NetworkStatus | Código |
| 5 | Melhorar mensagens de erro de rede nos hooks | Código |
| 6 | (Opcional) Habilitar hot reload para testes | Config |

---

## Seção Técnica

### Por que isso acontece no iOS?

O WKWebView do iOS tem comportamentos diferentes do browser:
1. Requisições de `capacitor://localhost` para domínios externos podem ser bloqueadas por ATS
2. O cache do WebView pode interferir com requisições
3. Problemas de DNS ou conectividade não são tratados da mesma forma

### Verificação de conectividade

O log mostra:
- `Connection interrupted` - indica perda momentânea de conexão
- `TypeError: Load failed` - erro genérico de rede no WebKit

Isso sugere que:
1. O dispositivo pode ter perdido conectividade momentaneamente
2. Ou o build está desatualizado e o código antigo não está funcionando corretamente

### Solução de longo prazo

Para produção, recomendo:
1. Implementar cache offline com service workers (já configurado)
2. Usar Capacitor HTTP plugin para requisições nativas (mais confiável que fetch no iOS)
3. Adicionar timeout adequado nas requisições
