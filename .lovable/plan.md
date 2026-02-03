

# Diagnóstico: App Nativo Não Reflete Mudanças do Preview

## Causa Raiz Identificada

O problema está na **configuração do Capacitor no seu ambiente local**. 

De acordo com a memória do projeto (`architecture/ios-native-config`), existe uma configuração de `server.url` no `capacitor.config.ts` que é usada durante desenvolvimento para hot-reload:

```json
"server": {
  "url": "https://ec821420-56a9-4147-adde-54a8d514aaac.lovableproject.com?forceHideBadge=true",
  "cleartext": true
}
```

**O que está acontecendo:**
- Quando essa configuração está presente, o app nativo carrega o conteúdo diretamente da URL do Lovable (servidor remoto)
- Isso é útil para desenvolvimento (hot-reload), mas **ignora completamente o bundle local**
- Portanto, mesmo fazendo `npm run build` e `npx cap sync`, o app continua carregando a versão do servidor

**Por que parece "diferente":**
- O preview do Lovable mostra as mudanças imediatamente (é a versão mais recente do código)
- O app nativo está carregando do servidor Lovable também, MAS pode haver:
  - Cache do servidor de CDN
  - Cache do próprio WKWebView iOS
  - A versão publicada (live) vs versão de preview

---

## Plano de Ação

### Solução Imediata (Para Testes)

Remover temporariamente a seção `server` do arquivo `capacitor.config.ts` no seu ambiente local:

**Antes:**
```typescript
const config: CapacitorConfig = {
  appId: 'app.lovable.ec82142056a94147adde54a8d514aaac',
  appName: 'paddock-collectible-hub',
  webDir: 'dist',
  server: {
    url: 'https://ec821420-56a9-4147-adde-54a8d514aaac.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};
```

**Depois:**
```typescript
const config: CapacitorConfig = {
  appId: 'app.lovable.ec82142056a94147adde54a8d514aaac',
  appName: 'paddock-collectible-hub',
  webDir: 'dist'
  // server removido para usar bundle local
};
```

---

### Fluxo Completo de Build (Após Remover server.url)

1. **No repositório local:**
   ```bash
   git pull origin main
   npm install
   npm run build
   npx cap sync
   ```

2. **No Xcode:**
   - Product → Clean Build Folder (⌘⇧K)
   - Deletar o app do iPhone/simulador
   - Build and Run (⌘R)

---

### Entendendo as Duas Modalidades

| Modo | Configuração | Uso |
|------|--------------|-----|
| **Desenvolvimento (hot-reload)** | `server.url` presente | Mudanças no Lovable aparecem instantaneamente no app |
| **Produção (bundle local)** | `server` removido | App usa os arquivos compilados em `/dist` |

---

## Por Que o Safe-Area Pode Ainda Não Funcionar

Mesmo após usar o bundle local, se o safe-area não funcionar:

1. **Verificar o viewport no bundle gerado:**
   - Abra o arquivo `dist/index.html` após rodar `npm run build`
   - Confirme que contém: `viewport-fit=cover`

2. **Verificar configuração nativa do Xcode:**
   - No projeto iOS, verificar se o `Info.plist` ou storyboard não está sobrescrevendo o comportamento do WebView

3. **WKWebView precisa de configuração específica:**
   - O Capacitor 8+ já deve lidar com isso automaticamente, mas vale verificar

---

## Recomendação Final

Para produção/TestFlight/App Store:
- **SEMPRE** remova a seção `server` do `capacitor.config.ts`
- Use o bundle local para garantir que a versão correta está embarcada

Para desenvolvimento diário:
- Mantenha a seção `server` para ter hot-reload instantâneo
- Mas lembre que isso carrega do servidor, não do bundle local

---

## Resumo

| Problema | Causa | Solução |
|----------|-------|---------|
| App não reflete mudanças | `server.url` no capacitor.config.ts | Remover a seção `server` e fazer build local |
| Safe-area não funciona | CSS não chegando ao app | Após remover server.url, fazer clean build completo |

