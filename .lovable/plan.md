
## Diagnóstico (por que continua aparecendo “Open Camera”)
O problema não é que o `getUserMedia` não está rodando — na verdade ele roda e abre a câmera (o “pontinho verde” no iPhone confirma isso).  
O problema é que o preview não aparece porque o `<video>` só é renderizado quando `cameraActive === true`, mas `cameraActive` só vira `true` **depois** que o código consegue acessar `videoRef.current`. Em outras palavras: o vídeo não existe na tela → o `ref` é `null` → não seta `cameraActive` → o vídeo nunca aparece (ciclo).

Isso também explica por que o usuário vê a tela do scanner com o botão “Open Camera” mesmo com a câmera já “em uso” pelo sistema.

## Objetivo de UX
Ao tocar no ícone da câmera na página principal (BottomNav), ao entrar no Scanner:
- a câmera já deve abrir automaticamente
- o preview deve aparecer
- o usuário só precisa do segundo clique para “Capture & Analyze” (enquadrar → capturar)

## Mudanças que vou implementar (todas em `src/components/scanner/ScannerView.tsx`)
### 1) Renderizar o `<video>` sempre (não condicionalmente)
- Em vez de:
  - `cameraActive && <video ref=... />`
- Passará a existir **sempre** um `<video ref={videoRef} />`, e a visibilidade será controlada por CSS (ex.: `hidden/opacity-0` quando não estiver ativo).
- Assim `videoRef.current` sempre existe e podemos “plugar” o stream nele.

### 2) Guardar o stream mesmo se o `ref` ainda não estiver pronto (proteção extra)
- No `initCamera`/`startCamera`, assim que o stream vier do `getUserMedia`:
  - salvar imediatamente em `streamRef.current`
  - setar `cameraActive(true)` independentemente do `videoRef.current`
- Isso evita perda de stream e garante consistência.

### 3) Efeito dedicado para “anexar” o stream ao vídeo + `play()`
Adicionar um `useEffect` que roda quando `cameraActive` muda e:
- se existir `videoRef.current` e `streamRef.current`, faz:
  - `videoRef.current.srcObject = streamRef.current`
  - `await videoRef.current.play().catch(() => {})`
- Isso resolve timing/race conditions (React render vs. stream chegando).

### 4) Cleanup e “Close” realmente liberando a câmera
- No `stopCamera` e no `useEffect` cleanup:
  - parar tracks
  - `streamRef.current = null`
  - também limpar `videoRef.current.srcObject = null` (quando existir)
- Meta: ao fechar o scanner, o “pontinho verde” deve sumir em poucos instantes.

### 5) Ajuste de UI para não sugerir clique extra
- Enquanto estiver “iniciando” a câmera automaticamente, mostrar uma mensagem curta (“Abrindo câmera…”) e esconder o call-to-action “Open Camera”.
- O botão “Open Camera” vira fallback apenas para caso de erro/permissão negada.

### 6) (Opcional) Pequenos logs de diagnóstico
- Adicionar `console.log`/`console.warn` bem objetivos (ex.: “camera stream acquired”, “video attached”) para facilitar validar rapidamente se o fluxo está certo.

## Critérios de aceite (o que deve acontecer depois)
1. Toque no ícone central de câmera (na barra inferior) → entra no scanner já com preview da câmera.
2. Sem precisar tocar em “Open Camera”.
3. Usuário enquadra e toca apenas em “Capture & Analyze”.
4. Ao fechar no “X”, a câmera é liberada (pontinho verde desliga).

## Teste recomendado
- Testar no iPhone Safari e também no navegador “dentro” do WhatsApp/Instagram (se for o caso).
- Se em algum in-app browser específico a Apple bloquear o preview, o fallback “Open Camera” + mensagem de instrução continuará existindo, mas no Safari deve funcionar 100%.

## Arquivos envolvidos
- `src/components/scanner/ScannerView.tsx` (refatoração do preview + controle de stream)
