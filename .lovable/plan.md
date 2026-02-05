
## Objetivo
Fazer o preview da câmera do plugin `@capacitor-community/camera-preview` aparecer no iOS (em vez de ficar um fundo preto), mantendo a UI do scanner por cima.

## Diagnóstico (por que ainda fica preto mesmo com “camera-preview started”)
No iOS, o plugin realmente está iniciando (e você consegue capturar foto, então a sessão de câmera está funcionando). O que está acontecendo é:

- O plugin renderiza a câmera **atrás da WebView** (`toBack: true`).
- Mesmo que a WebView esteja transparente no nível nativo, o **HTML ainda está “pintando” um fundo escuro** (principalmente o `body`, que no seu `src/index.css` sempre aplica `bg-background`).
- Resultado: você vê a UI (porque está no HTML), mas o “fundo” continua sendo o background do `body` (preto/escuro), e não a câmera.

Importante: hoje vocês só deixam transparente o container do scanner (`native-camera-mode`), mas **o `body` continua opaco**, então ele ainda cobre a câmera.

## Abordagem de correção (frontend, robusta)
Vamos tornar o `html/body/#root` transparentes **somente enquanto o `useCameraPreview` estiver ativo**, e restaurar assim que sair do scanner ou quando o preview parar.

### Mudanças propostas

#### 1) `src/components/scanner/ScannerView.tsx`
Adicionar um `useEffect` que, quando `useCameraPreview === true`:

- Guarda os valores atuais do inline-style de `background-color` de:
  - `document.documentElement` (html)
  - `document.body`
  - `#root`
- Aplica:
  - `background-color: transparent !important` (via `style.setProperty(..., 'important')`)
- No cleanup (quando `useCameraPreview` virar false ou unmount), restaura os valores anteriores (ou remove a propriedade se não existia).

Isso resolve o caso clássico “UI aparece, fundo preto, mas a câmera está atrás”.

##### Observação importante sobre CSS atual
Hoje existe isto em `src/index.css`:
```css
.native-camera-mode * {
  background-color: transparent !important;
}
```
Não vamos depender disso para resolver o problema do `body` (porque `body` não é filho do container). E, como esse seletor é agressivo, o ideal é **não precisar** adicionar `native-camera-mode` no `body` (para não “quebrar” fundos de cards/botões). A proposta acima (inline style só no `body/html/root`) evita esse efeito colateral.

#### 2) (Opcional, mas recomendado) Log de verificação
Adicionar logs temporários quando `useCameraPreview` ativar:
- `getComputedStyle(document.body).backgroundColor`
- `getComputedStyle(document.documentElement).backgroundColor`
Antes e depois de setar transparent, para confirmar que a mudança está efetiva no device.

#### 3) (Opcional) Simplificar options do `CameraPreview.start` no iOS
Hoje vocês passam `width/height/x/y`. No iOS o plugin já usa fullscreen por padrão quando não recebe isso.
Podemos simplificar para reduzir variáveis:
- Remover `width`, `height`, `x`, `y` (deixar o plugin usar `UIScreen.main.bounds`)
- Manter `toBack: true`, `position`, `enableZoom`, `disableAudio`, `enableHighResolution`

Isso não é o principal (o principal é o `body`), mas ajuda a reduzir chance de frame incorreto.

## Como vamos testar (checklist bem objetivo)
1) No iPhone físico, abrir `/scanner`.
2) Confirmar:
   - UI do scanner aparece (botões).
   - Agora dá para ver o feed da câmera atrás da UI (não apenas preto).
3) Tirar foto:
   - O flash/efeitos funcionam
   - A captura continua funcionando como antes
4) Navegar para outra tela (ex: Home/Perfil):
   - Confirmar que o fundo normal (tema escuro) voltou (ou seja, não “vazou” transparência para o app inteiro).
5) Voltar para o scanner:
   - Transparência reaplica corretamente.

## Riscos / Edge cases
- Se algum elemento do scanner tiver um `bg-black` fullscreen proposital, ele continuará cobrindo a câmera. Porém no seu código atual, quando `useCameraPreview` é true, o container principal usa `bg-transparent`, então o esperado é a câmera aparecer.
- O warning do `UIScene lifecycle...` não é a causa do preview preto; é um aviso de ciclo de vida do app (podemos tratar depois, mas não bloqueia esse bug).

## Arquivos que serão alterados
- `src/components/scanner/ScannerView.tsx` (principal)
- `src/hooks/useNativeCameraPreview.ts` (opcional – simplificar options no iOS)

## Critério de sucesso
- Em dispositivo físico iOS, ao entrar no scanner, a câmera aparece atrás da UI sem tela preta, e ao sair do scanner o app volta ao tema normal sem efeitos colaterais.
