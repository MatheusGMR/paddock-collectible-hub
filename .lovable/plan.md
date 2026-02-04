
## Objetivo
1) Garantir que o app iOS esteja realmente carregando o bundle mais novo (já que “BUILD v2” **não existe mais no código atual**).  
2) Destravar a câmera no iOS usando **câmera nativa** (já existe fallback no código, mas você ainda está rodando bundle antigo).

---

## O que eu confirmei no código (importante)
- `src/components/profile/ProfileHeader.tsx` **não tem** mais o badge “BUILD v2”.
- O `ScannerView.tsx` atual tem logs novos como **`[Scanner] Requesting camera stream...`** e o fallback nativo (**`[Scanner] Falling back to native camera...`**).
- Seus logs do Xcode ainda mostram:
  - `[Scanner] Permissions not yet granted, requesting now...`
  - `[Permissions] Camera permission denied: {}`
  
Essas mensagens indicam que o app iOS está rodando uma versão anterior do Scanner (e possivelmente copiando assets antigos para o iOS).

---

## Hipótese mais provável (por que o iOS ainda mostra “BUILD v2”)
Mesmo com “Clean Build Folder” e apagar o app, o iOS pode continuar com bundle antigo se **o iOS estiver recebendo assets de um diretório errado** (ex.: `webDir` diferente de `dist`) ou se houver **mais de um projeto/pasta** sendo compilado no Xcode.

Como o repositório aqui **não contém** `capacitor.config.ts/json`, cada máquina pode estar com uma config diferente — e isso é a receita para “sync/build” parecer funcionar, mas copiar conteúdo velho.

---

## Mudanças planejadas no código (para diagnosticar e corrigir)
### 1) Carimbo de build (para provar 100% qual bundle está rodando)
**Por que:** enquanto você não enxergar um identificador que muda a cada build, a gente fica “no escuro”.

**Implementação:**
- Em `vite.config.ts`, adicionar um `define` com um timestamp/string única, tipo `__WEB_BUILD_ID__`.
- Em `src/vite-env.d.ts`, declarar o tipo (`declare const __WEB_BUILD_ID__: string;`) para o TS não reclamar.
- Em `src/main.tsx`, logar na inicialização:
  - `console.log("[App] WEB_BUILD_ID", __WEB_BUILD_ID__)`
- Em `src/components/profile/SettingsSheet.tsx`, trocar o “Paddock v1.0.0” fixo por algo como:
  - `Paddock v1.0.0 • web: <__WEB_BUILD_ID__>`
  - e, em iOS/Android, também mostrar informações nativas via `App.getInfo()` (build e version do app). Isso ajuda a detectar se você está abrindo o app “errado” no aparelho.

**Critério de sucesso:** depois do seu próximo build, você deve ver o novo `WEB_BUILD_ID` no log e no Settings. Se não mudar, o Xcode não está usando os assets novos.

---

### 2) Padronizar a config do Capacitor no repositório (evitar webDir errado)
**Por que:** sem `capacitor.config.ts` versionado, seu `npx cap sync` pode estar copiando do lugar errado.

**Implementação:**
- Criar `capacitor.config.ts` no root com:
  - `appId` e `appName` corretos (os que vocês já estão usando)
  - `webDir: "dist"` (Vite build padrão)
  - Sem `server.url` por padrão (para não confundir produção vs hot reload)
- (Opcional) Documentar no README um checklist curto: `git pull → npm i → npm run build → npx cap sync ios → abrir Xcode`.

**Critério de sucesso:** o `npx cap sync ios` passa a sempre copiar de `dist` e o build ID muda.

---

### 3) Tornar o modo “câmera nativa” o padrão no iOS (menos atrito, menos erros)
Mesmo com fallback, hoje o Scanner tenta `getUserMedia` primeiro. Em iOS isso frequentemente vira “denied”/“{}” e ainda depende de contexto/gesto.

**Implementação:**
- Em `src/components/scanner/ScannerView.tsx`:
  - Se `Capacitor.isNativePlatform()` (ou pelo menos iOS), **não** iniciar `getUserMedia` automaticamente.
  - Entrar direto em `useNativeFallback = true` e exibir a UI preta “Toque no botão para abrir a câmera”.
  - A permissão passa a ser solicitada quando o usuário toca no botão (fluxo mais estável no iOS).

**Critério de sucesso:** no iOS, ao abrir o Scanner:
- não aparece tentativa de `getUserMedia`
- ao tocar no botão, abre a câmera nativa e pede permissão corretamente.

---

### 4) Ajustar o onboarding para não “queimar” a permissão de câmera no iOS
Hoje o onboarding chama `usePermissions().requestAllPermissions()` e esse hook tenta pedir câmera via `navigator.mediaDevices.getUserMedia()` — que no iOS nativo pode falhar e “marcar” a experiência como negada.

**Implementação:**
- Em `src/hooks/usePermissions.ts`:
  - Se estiver em plataforma nativa, pedir permissão de câmera via `@capacitor/camera` (Camera.checkPermissions/requestPermissions com `['camera', 'photos']`).
  - Evitar marcar como “denied” de forma irreversível por localStorage quando o iOS apenas bloqueou a tentativa web.
- Em `PricingSlide.tsx`, manter o fluxo, mas agora o request é o correto no nativo.

**Critério de sucesso:** ao aceitar no onboarding no iOS, a permissão de câmera passa a ser solicitada pelo fluxo nativo (ou você opta por não pedir câmera no onboarding e só pedir no Scanner).

---

## Passos no seu Mac (validação prática depois que eu implementar)
1) **Garanta que você está no repo/pasta correta** (a mesma que o Xcode está apontando).  
2) `git pull` e confirme que “BUILD v2” não existe mais.
3) `npm install`
4) `npm run build`
5) `npx cap sync ios`
6) Abra o Xcode e rode.
7) No console do Xcode procure por:
   - `[App] WEB_BUILD_ID ...` (precisa aparecer e mudar a cada build)
8) Abra **Profile → Configurações** e veja o build ID lá também.

Se o build ID **não mudar**, o próximo diagnóstico é: o Xcode está compilando um projeto iOS que está ligado a outra pasta/repo, ou o `webDir` estava errado e ainda está copiando assets antigos.

---

## Observações sobre os warnings do log
- `UIScene lifecycle will soon be required...` e os warnings de constraints geralmente **não impedem** câmera nem atualização de bundle. Vamos focar em garantir o bundle correto primeiro.

---

## Plano de teste (checklist rápido)
- iOS:
  - Profile não mostra “BUILD v2”
  - Settings mostra `WEB_BUILD_ID` atual
  - Scanner abre em modo nativo e tira foto
  - Selecionar da galeria funciona (permissão de Photos ok)
- Web (preview):
  - Scanner continua com câmera ao vivo (getUserMedia) normalmente
- Regressão:
  - Deep link handler continua funcionando (sem impacto)

---

## Riscos / cuidados
- Se a permissão de câmera já estiver negada no iOS Settings, o iOS pode não mostrar prompt novamente; nesse caso a UI deve orientar “Ajustes → Paddock → Câmera”.
- O `capacitor.config.ts` precisa refletir exatamente o que você está usando localmente para não quebrar o fluxo atual do Xcode.

