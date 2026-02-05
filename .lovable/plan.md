
# Diagnóstico e Correção: Erro de Captura no Scanner iOS

## Problema Identificado

O terminal iOS mostra:
```
Error starting trial: {"name":"FunctionsFetchError","context":{}}
```

E os logs das edge functions (`analyze-collectible`, `start-trial`) mostram **apenas boot/shutdown - zero requisições chegando**. Isso confirma que o problema está na camada de rede do dispositivo, não no backend.

### Causa Raiz: CapacitorHttp Plugin

A última alteração habilitou o plugin `CapacitorHttp`:

```typescript
plugins: {
  CapacitorHttp: {
    enabled: true,  // ← CAUSA DO PROBLEMA
  },
}
```

**Por que isso quebra o Supabase SDK:**
- O plugin intercepta TODAS as chamadas `fetch()` e as redireciona para código nativo iOS
- O SDK do Supabase usa `fetch` internamente com headers específicos (Authorization, apikey)
- Há incompatibilidades conhecidas entre o CapacitorHttp e o cliente Supabase JS
- O iOS nativo não repassa corretamente os headers de autenticação
- Resultado: as requisições falham antes de sair do dispositivo

---

## Solução

### Ação: Remover o plugin CapacitorHttp

| Arquivo | Alteração |
|---------|-----------|
| `capacitor.config.ts` | Remover bloco `plugins: { CapacitorHttp: ... }` |

**Configuração final:**
```typescript
const config: CapacitorConfig = {
  appId: 'app.lovable.ec82142056a94147adde54a8d514aaac',
  appName: 'paddock-collectible-hub',
  webDir: 'dist',
  ios: {
    backgroundColor: '#00000000', // Mantém transparência para câmera
  },
  // Sem plugins de HTTP - WKWebView moderno funciona nativamente
};
```

---

## Por que WKWebView Funciona sem o Plugin

O iOS 14+ possui um WKWebView moderno que:
- Suporta `fetch()` nativamente com todos os headers
- Lida corretamente com CORS quando configurado no servidor
- É compatível com streaming e autenticação Bearer
- **Já estava funcionando antes** - não precisa de patch

Os warnings no terminal ("Unable to satisfy constraints", "RTIInputSystemClient") são avisos internos do iOS sobre teclado e auto-layout - **não estão relacionados ao problema de rede**.

---

## Fluxo do Scanner (Confirmação de Estabilidade)

O fluxo atual está bem estruturado:

```text
┌─────────────────────────────────────────────────────────────┐
│  1. INICIALIZAÇÃO                                           │
│  ├─ Verifica plataforma (iOS/Web)                          │
│  ├─ iOS: CameraPreview.start() → feed atrás da WebView     │
│  └─ Web: getUserMedia() → feed no <video>                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  2. CAPTURA                                                 │
│  ├─ Flash visual (150ms)                                   │
│  ├─ CameraPreview.capture() → base64                       │
│  ├─ Para câmera imediatamente (congela frame)              │
│  └─ Exibe imagem capturada                                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  3. ANÁLISE                                                 │
│  ├─ Mostra LoadingFacts (curiosidades + progresso)         │
│  ├─ supabase.functions.invoke("analyze-collectible")       │
│  │   └─ ❌ FALHA AQUI com CapacitorHttp ativado            │
│  ├─ Normaliza resposta (count, items, identified)          │
│  └─ Detecta tipo: collectible ou real_car                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  4. PÓS-PROCESSAMENTO                                       │
│  ├─ Recorta imagens por boundingBox                        │
│  ├─ Verifica duplicatas na coleção                         │
│  ├─ Enriquece com fotos reais (Wikimedia)                  │
│  └─ Exibe ResultCarousel ou RealCarResults                 │
└─────────────────────────────────────────────────────────────┘
```

O fluxo está **correto e robusto**. O único problema é a camada de rede quebrada pelo plugin.

---

## Resultado Esperado

Após remover o plugin:
- ✅ Scanner volta a identificar carros normalmente
- ✅ `start-trial` funciona no onboarding
- ✅ Todas as edge functions recebem requisições
- ✅ Câmera continua funcionando com preview nativo
- ✅ Nenhuma outra mudança necessária no código do scanner

---

## Próximos Passos

1. Remover o bloco `plugins` do `capacitor.config.ts`
2. Rebuild do app iOS (`npx cap sync ios` + rebuild no Xcode)
3. Testar scanner end-to-end com uma foto única
