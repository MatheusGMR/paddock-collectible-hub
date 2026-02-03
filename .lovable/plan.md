
# Plano: Corrigir OAuth (Google/Apple) no App iOS Nativo

## Problema Identificado

Quando o usuário clica em "Continuar com Google" ou "Continuar com Apple" no app iOS nativo (via Capacitor), a tela fica branca porque:

1. O `redirect_uri` está configurado como `window.location.origin`
2. No app nativo, isso resolve para `capacitor://localhost` ou esquema similar
3. Após autenticar no navegador externo, o redirecionamento não consegue voltar ao app
4. Resultado: tela branca permanente

## Solução

Implementar **Deep Linking** no Capacitor para capturar o retorno do OAuth e processar a autenticação corretamente.

---

## Etapa 1: Instalar Plugin de App Listener (Capacitor)

No seu terminal local:

```bash
npm install @capacitor/app
npx cap sync ios
```

---

## Etapa 2: Configurar URL Scheme no iOS

No Xcode, configurar o URL Scheme para que o app capture deep links:

1. Abrir `ios/App/App/Info.plist`
2. Adicionar URL Scheme `paddock` (ou usar o bundle ID reverso)

Ou via Xcode:
- **TARGETS → App → Info → URL Types**
- Adicionar: `paddock` ou `com.matheusgmr.paddock`

---

## Etapa 3: Criar Listener de Deep Link

Criar um componente que escuta URLs abertas no app e processa o callback OAuth:

```typescript
// src/components/DeepLinkHandler.tsx
import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

export const DeepLinkHandler = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleDeepLink = App.addListener("appUrlOpen", async (event) => {
      console.log("[DeepLink] URL received:", event.url);
      
      try {
        const url = new URL(event.url);
        
        // Check for OAuth callback params
        const accessToken = url.searchParams.get("access_token");
        const refreshToken = url.searchParams.get("refresh_token");
        
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }
      } catch (error) {
        console.error("[DeepLink] Error processing URL:", error);
      }
    });

    return () => {
      handleDeepLink.remove();
    };
  }, []);

  return null;
};
```

---

## Etapa 4: Integrar no App.tsx

Adicionar o `DeepLinkHandler` no componente principal:

```typescript
// Em App.tsx, após os providers
<DeepLinkHandler />
```

---

## Etapa 5: Atualizar Redirect URI

Modificar o `redirect_uri` no Auth.tsx para usar o deep link scheme no ambiente nativo:

```typescript
import { Capacitor } from "@capacitor/core";

const getRedirectUri = () => {
  if (Capacitor.isNativePlatform()) {
    return "paddock://auth/callback"; // ou com.matheusgmr.paddock://
  }
  return window.location.origin;
};

// Nas funções handleGoogleSignIn e handleAppleSignIn:
const { error } = await lovable.auth.signInWithOAuth("google", {
  redirect_uri: getRedirectUri(),
});
```

---

## Etapa 6: Configurar Lovable Cloud Auth

No painel do Lovable Cloud, adicionar o redirect URI nativo:
- `paddock://auth/callback`
- `com.matheusgmr.paddock://`

---

## Resumo das Mudanças

| Local | Ação |
|-------|------|
| `package.json` local | Instalar `@capacitor/app` |
| `ios/App/App/Info.plist` | Adicionar URL Scheme |
| `src/components/DeepLinkHandler.tsx` | Criar novo componente |
| `src/App.tsx` | Adicionar DeepLinkHandler |
| `src/pages/Auth.tsx` | Usar redirect URI dinâmico |
| Lovable Cloud | Adicionar redirect URI nativo |

---

## Alternativa Simplificada

Se o fluxo de deep link for complexo demais neste momento, uma alternativa é:

1. **Desabilitar OAuth no app nativo** - mostrar apenas login por email/senha
2. **Detectar plataforma** e esconder os botões Google/Apple quando `Capacitor.isNativePlatform()` for true

```typescript
import { Capacitor } from "@capacitor/core";

const isNative = Capacitor.isNativePlatform();

// No render, esconder botões OAuth se for nativo:
{!isNative && (
  <>
    <Button onClick={handleGoogleSignIn}>Google</Button>
    <Button onClick={handleAppleSignIn}>Apple</Button>
  </>
)}
```

---

## Seção Técnica

### Dependências Necessárias (local)
```bash
npm install @capacitor/app @capacitor/core
npx cap sync ios
```

### Info.plist - URL Scheme
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>paddock</string>
      <string>com.matheusgmr.paddock</string>
    </array>
  </dict>
</array>
```

### Verificação
Após configurar, testar com:
```bash
xcrun simctl openurl booted "paddock://auth/callback?test=1"
```
