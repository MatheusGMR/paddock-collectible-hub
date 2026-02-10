

# Solucao: Forcar limpeza de cache no WKWebView via Capacitor

## Problema
O codigo-fonte nao contem botoes de Google/Apple. Todos os componentes de auth (`Auth.tsx`, `AuthStepEmail.tsx`, `AuthStepLogin.tsx`) estao corretos. O problema e exclusivamente cache do WKWebView no iOS, que persiste assets antigos mesmo apos `npm run build` e `npx cap sync ios`.

## Abordagens ja testadas (sem sucesso)
1. Hard refresh / force close do app
2. `git pull` + `npm install` + `npm run build` + `npx cap sync ios`
3. Deletar app do dispositivo + Clean Build Folder no Xcode
4. Limpar DerivedData

## Solucao proposta

Adicionar um script de limpeza de cache do WKWebView que roda na inicializacao do app, garantindo que assets web antigos sejam descartados.

### Passo 1: Adicionar versao de build no HTML
Inserir uma meta tag com timestamp de build no `index.html` para invalidar cache:

```html
<meta name="build-version" content="__BUILD_TIMESTAMP__" />
```

E configurar o `vite.config.ts` para substituir `__BUILD_TIMESTAMP__` automaticamente em cada build.

### Passo 2: Cache-busting no service worker
Atualizar `public/sw.js` para nao cachear a pagina de auth e forcar atualizacao.

### Passo 3: Limpeza de cache via Capacitor plugin (principal)
No `App.tsx` ou no ponto de entrada, adicionar logica que:
- Compara o `WEB_BUILD_ID` atual com o armazenado no `localStorage`
- Se diferente, limpa caches do WKWebView usando `caches.delete()` e forca reload

```typescript
const currentBuild = "__BUILD_TIMESTAMP__";
const storedBuild = localStorage.getItem("app_build_id");
if (storedBuild && storedBuild !== currentBuild) {
  caches.keys().then(names => names.forEach(name => caches.delete(name)));
  localStorage.setItem("app_build_id", currentBuild);
  window.location.reload();
} else {
  localStorage.setItem("app_build_id", currentBuild);
}
```

### Passo 4: Headers de cache no Capacitor
Atualizar `capacitor.config.ts` para desabilitar cache do servidor local:

```typescript
server: {
  androidScheme: 'https',
  iosScheme: 'capacitor',
  cleartext: true,
}
```

## Arquivos modificados
1. `vite.config.ts` - adicionar plugin de replace para BUILD_TIMESTAMP
2. `index.html` - meta tag de versao
3. `src/main.tsx` - logica de cache-busting na inicializacao
4. `public/sw.js` - nao cachear rotas de auth

## Resultado esperado
Cada novo build gera um timestamp unico. Quando o app iOS detecta uma versao diferente da armazenada, limpa todos os caches e recarrega, garantindo que a UI mais recente seja sempre exibida.

