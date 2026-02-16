

# Correcao das Notificacoes Push

## Diagnostico

Apos analisar toda a cadeia de push notifications, identifiquei os seguintes problemas:

### Problema principal: A Edge Function nunca e invocada

O fluxo falha **antes** de chegar na Edge Function. Existem dois cenarios possiveis:

**Cenario A - Web (Preview/Browser):**
O preview do Lovable roda dentro de um iframe cross-origin. Service Workers e a Push API **nao funcionam** em iframes cross-origin por restricoes de seguranca do navegador. Isso faz com que `subscribeWeb()` falhe silenciosamente ao tentar registrar o Service Worker (`/sw.js`), retornando `false`, e o toast de erro aparece.

**Cenario B - iOS Nativo (Capacitor):**
No fluxo nativo, `subscribeNative()` registra listeners e chama `plugin.register()`. Se o APNs nao estiver configurado corretamente no Xcode (Push Notification Capability + APNs Key), o evento `registration` nunca dispara e o timeout de 20s resolve com `false`.

### Problemas secundarios encontrados

1. **`PushNotificationToggle`**: Na linha 60, o `handleToggle` chama `requestPushPermission()` separadamente e depois `subscribeToPush()`. No nativo, isso causa uma chamada dupla ao sistema de permissoes, pois `subscribeToPush` -> `subscribeNative` -> `register()` ja pede permissao internamente.

2. **Toast generico**: A mensagem de erro "Nao foi possivel ativar as notificacoes" nao indica a causa real (falta de VAPID key, SW falhou, timeout nativo, etc), dificultando o debug.

3. **Service Worker no Preview**: O `sw.js` e registrado em `/sw.js` mas no contexto do preview iframe isso falha sem log claro.

4. **Sem fallback de diagnostico**: Nenhum console.log no fluxo web antes da chamada a Edge Function para identificar onde para.

---

## Plano de Correcao

### 1. Adicionar logs detalhados no fluxo web (`subscribeWeb`)

Adicionar `console.log` em cada etapa de `subscribeWeb()` em `src/lib/pushNotifications.ts` para identificar exatamente onde o fluxo quebra:
- Antes de chamar a Edge Function para VAPID key
- Antes/depois do registro do Service Worker
- Antes/depois da inscricao no PushManager

### 2. Tratar erro de SW em contexto iframe

Antes de tentar registrar o Service Worker, verificar se estamos em um iframe e se o `navigator.serviceWorker` esta realmente disponivel e funcional. Se nao estiver, mostrar uma mensagem adequada ao usuario.

Em `src/lib/pushNotifications.ts`:
- Adicionar verificacao `window.self !== window.top` para detectar iframe
- Retornar um erro claro em vez de falhar silenciosamente

### 3. Unificar o fluxo de permissao + inscricao no `PushNotificationToggle`

Em `src/components/news/PushNotificationToggle.tsx`:
- No `handleToggle`, quando `checked=true`, chamar **apenas** `subscribeToPush(user.id)` diretamente
- Mover a logica de permissao para dentro de `subscribeToPush` (ja esta la para nativo, fazer o mesmo para web)
- Eliminar a chamada separada a `requestPushPermission()` que duplica a solicitacao

### 4. Melhorar as mensagens de erro com diagnostico

Em `src/lib/pushNotifications.ts`:
- Fazer `subscribeToPush` retornar um objeto `{ success: boolean; reason?: string }` em vez de apenas `boolean`
- Razoes possiveis: `'iframe_context'`, `'sw_failed'`, `'vapid_missing'`, `'permission_denied'`, `'token_timeout'`, `'edge_function_error'`

Em `src/components/news/PushNotificationToggle.tsx`:
- Usar a `reason` retornada para exibir uma mensagem de toast especifica e util ao usuario

### 5. Garantir que `requestPushPermission` trata o fluxo web

Em `src/lib/pushNotifications.ts`, funcao `requestPushPermission()`:
- Adicionar try/catch ao redor de `Notification.requestPermission()` para capturar erros em contextos restritos (iframe, browsers antigos)
- Retornar `'denied'` em vez de lancar excecao

### 6. Ajustar `AuthStepPermissions` para evitar chamada dupla

Em `src/components/auth/AuthStepPermissions.tsx`:
- No auto-activate de push, chamar apenas `subscribeToPush(user.id)` que ja cuida da permissao internamente
- Remover a chamada separada a `requestPushPermission()` antes de `subscribeToPush()`

---

## Detalhes Tecnicos

### Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/lib/pushNotifications.ts` | Retorno tipado com `reason`, logs no fluxo web, deteccao de iframe, permissao integrada no `subscribeWeb` |
| `src/components/news/PushNotificationToggle.tsx` | Consumir `reason` para toasts especificos, remover chamada duplicada de permissao |
| `src/components/auth/AuthStepPermissions.tsx` | Simplificar para chamar apenas `subscribeToPush` |
| `src/components/profile/SettingsSection.tsx` | Consumir novo retorno tipado |
| `src/components/profile/SettingsSheet.tsx` | Consumir novo retorno tipado |

### Novo tipo de retorno

```typescript
interface PushSubscribeResult {
  success: boolean;
  reason?: 'iframe_context' | 'sw_failed' | 'vapid_missing' | 'permission_denied' | 'token_timeout' | 'edge_function_error' | 'not_supported';
}
```

### Mapa de mensagens por reason

| reason | Mensagem para o usuario |
|--------|------------------------|
| `iframe_context` | "Abra o app diretamente no navegador para ativar notificacoes" |
| `sw_failed` | "Erro ao registrar servico de notificacoes. Tente recarregar a pagina" |
| `vapid_missing` | "Configuracao do servidor incompleta. Contate o suporte" |
| `permission_denied` | "Permissao negada. Habilite nas configuracoes do navegador/dispositivo" |
| `token_timeout` | "Nao foi possivel registrar o dispositivo. Verifique sua conexao" |
| `edge_function_error` | "Erro ao salvar inscricao. Tente novamente" |
| `not_supported` | "Notificacoes push nao sao suportadas neste ambiente" |

