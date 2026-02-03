
Objetivo: corrigir de forma definitiva (i) tooltip do tutorial sempre centralizado e clicável, (ii) respeito à área segura (notch) em todas as telas/headers, e (iii) abertura da câmera no iOS/Android nativo sem erro de permissão recorrente.

## Diagnóstico (por que “mesmos erros” continuam)
1) **Tooltip “descentralizado” mesmo com top/left 50%**  
   No `SpotlightOverlay.tsx`, o card do tutorial é um `motion.div` que anima `scale`. O Framer Motion aplica `transform` para animação e isso pode **sobrescrever** o `transform: translate(-50%, -50%)` que estava sendo usado para centralizar. Resultado típico: o card fica “deslocado” (parece descentralizado) e às vezes parte dele fica fora da tela, impedindo clique.

2) **Notch sendo invadido apesar de `pt-safe` no AppLayout**  
   Em várias telas vocês usam **headers `sticky top-0`** (Feed, Mercado/News, Notificações, ListingDetails, Admin). Elementos `sticky` grudam no topo da viewport e **não respeitam** o padding do pai (`AppLayout pt-safe`). Por isso o logo/botões “sobem” para dentro do notch.  
   Além disso, no **Scanner** há botões com `absolute top-4` e watermark `top-4`, que inevitavelmente invade o notch em iPhones.

3) **Câmera falhando com mensagem de permissão**  
   O `ScannerView` e o `usePermissions` chamam `getUserMedia` com **`audio: true`**. Em iOS nativo isso frequentemente exige permissão/descrição de microfone no projeto nativo e pode falhar mesmo quando a intenção é só foto. Se o microfone não foi concedido (ou não está configurado no app nativo), a chamada pode falhar e vocês recebem o erro genérico de câmera/permissão.

---

## Mudanças propostas (arquitetura e arquivos)
### A) Tooltip do tutorial: “sempre no centro” e sem risco de ficar fora da tela
**Arquivo:** `src/components/guided-tips/SpotlightOverlay.tsx`

1. **Remover centralização via `transform` no mesmo elemento que anima `scale`**.  
   Em vez disso, usar um *wrapper* que centraliza via layout (flex), e animar o card dentro:
   - Overlay root: `fixed inset-0` + `flex items-center justify-center` + `px-6` (para margem lateral).
   - Um container “centralizador” (não animado) controla posição.
   - O card real (animado) fica dentro e pode animar `scale/opacity` sem quebrar a centralização.

2. Garantias adicionais:
   - Definir `maxHeight` e `overflow-auto` no card para casos extremos (tela pequena + textos longos), evitando que o botão “Próximo” fique inacessível.
   - Manter touch targets mínimos (40px) como já está.
   - Manter `z-index` alto (já está ok).

**Resultado esperado:** tooltip 100% centralizado em qualquer aba (mercado, scanner, perfil, etc.), sem “deslocar” por causa do `transform` do Framer.

---

### B) Notch / área segura: padronizar “Safe Sticky Headers”
**Arquivos a ajustar (principais encontrados):**
- `src/components/feed/FeedHeader.tsx`
- `src/components/news/NewsHeader.tsx`
- `src/components/mercado/MercadoHeader.tsx` (mesmo que não seja o header ativo hoje, vale padronizar)
- `src/pages/Notifications.tsx` (header inline)
- `src/pages/ListingDetails.tsx` (header inline)
- `src/pages/Admin.tsx` (header)
- (opcional mas recomendado) `src/components/ui/toast.tsx` (ToastViewport fixo no topo)

**Padrão recomendado para cada header sticky:**
- Header externo:
  - `className="sticky top-0 z-40 ... pt-safe"` para que o background do header cubra também a área do notch.
- Conteúdo interno:
  - colocar o layout/altura em um `<div className="flex h-14 items-center ... px-4"> ... </div>`
  - isso mantém a altura visual igual, mas empurra o conteúdo para baixo do notch.

**Toast (popup vermelho) respeitando notch:**
- Em `ToastViewport`, adicionar `pt-safe` quando `top-0` for usado, para que o toast não apareça “dentro” do notch.

**Resultado esperado:** logo/botões nunca entram no notch em Feed/Mercado/Notificações/Admin/Detalhes; e os toasts aparecem “abaixo” da área segura.

---

### C) Scanner: manter câmera full-screen, mas controles abaixo do notch
**Arquivo:** `src/components/scanner/ScannerView.tsx`  
**Arquivo extra a checar:** `src/components/scanner/RealCarGallery.tsx` (tem `absolute top-4 right-4`)

1. **Substituir `top-4` por top com safe-area** nos elementos de UI:
   - watermark (PaddockLogo)
   - botão fechar (X)
   - botão flip camera
   - guias/corners e animação de scanning que usam `top-16`
   
   Exemplo de estratégia (Tailwind arbitrary):
   - `top-[calc(env(safe-area-inset-top)+1rem)]` no lugar de `top-4`
   - e para itens que eram `top-16`, algo como `top-[calc(env(safe-area-inset-top)+4rem)]`
   
   Assim o vídeo continua ocupando o notch (imersivo), mas a UI fica “segura”.

2. Também ajustar o `RealCarGallery.tsx` para o botão de fechar respeitar notch (mesmo padrão acima).

**Resultado esperado:** scanner continua premium/imersivo, mas nenhum botão/wordmark fica cortado pela notch.

---

### D) Câmera: reduzir o atrito de permissão (principalmente iOS nativo)
**Arquivos:**
- `src/components/scanner/ScannerView.tsx`
- `src/hooks/usePermissions.ts`

1. **Trocar `audio: true` por `audio: false`** em todas as chamadas `getUserMedia` usadas para abrir câmera/permissão:
   - `ScannerView` (auto init + manual startCamera)
   - `usePermissions.requestAllPermissions` (onde “testa” permissão)

2. **Não travar a câmera tentando pedir “todas permissões” em sequência**:
   - No `ScannerView`, em vez de depender de `requestAllPermissions()` (que também pede notificações), a câmera deve tentar abrir diretamente; se falhar por falta de permissão, exibir UI de erro + “Tentar novamente” (já existe).
   - Se mantiver a etapa de “permissões” no onboarding, ela deve:
     - pedir câmera primeiro (sem áudio)
     - e pedir notificações depois (sem bloquear caso o iOS recuse por política/estado)

3. **Mensagens de erro mais específicas**:
   - Detectar `NotAllowedError` e mostrar texto orientando a habilitar nas permissões do sistema.
   - Manter texto genérico apenas para erros desconhecidos.

**Resultado esperado:** em iOS nativo, a câmera passa a abrir sem exigir microfone; e, quando negar, o usuário recebe instrução clara e consegue recuperar pelo “Tentar novamente”.

---

## Checklist de validação (end-to-end)
1) **Tooltip**: abrir Feed/Mercado/Perfil/Notificações/Scanner e confirmar que o card do tutorial fica centralizado e o botão “Próximo” é clicável em todas.  
2) **Notch**: em iPhone com notch, validar que:
   - FeedHeader / NewsHeader / Notificações / Admin / Detalhes não invadem notch
   - toast “destructive” aparece abaixo do notch
3) **Scanner**:
   - botões (X, flip) e watermark não ficam dentro do notch
   - câmera abre sem erro (principalmente após instalar build limpa)
4) **Cenários de permissão**:
   - permissão “Nunca” (denied) -> UI de erro + “Tentar novamente” + instrução
   - permissão “Permitir” -> câmera abre e tutorial só inicia depois que `cameraActive` estiver ok

---

## Observação importante para build nativa (para garantir que o teste está pegando o código novo)
Depois de eu implementar, o fluxo recomendado para atualizar o app nativo é:
1) `git pull`
2) `npm install` (se necessário)
3) `npm run build`
4) `npx cap sync ios` (e/ou `npx cap sync android`)
5) rodar/buildar novamente no Xcode/Android Studio

(Se vocês já fazem isso e mesmo assim “parece não mudar”, eu incluo um “Build ID” visível na tela de Configurações para confirmar rapidamente que a versão certa está instalada.)

---

## Arquivos que provavelmente serão alterados
- `src/components/guided-tips/SpotlightOverlay.tsx`
- `src/components/feed/FeedHeader.tsx`
- `src/components/news/NewsHeader.tsx`
- `src/components/mercado/MercadoHeader.tsx`
- `src/pages/Notifications.tsx`
- `src/pages/ListingDetails.tsx`
- `src/pages/Admin.tsx`
- `src/components/ui/toast.tsx`
- `src/components/scanner/ScannerView.tsx`
- `src/components/scanner/RealCarGallery.tsx`
- `src/hooks/usePermissions.ts`

