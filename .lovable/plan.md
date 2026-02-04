# Plano: Experiência de Câmera Imersiva no iOS ✅ IMPLEMENTADO

## Status: Concluído

A implementação foi realizada usando o plugin `@capacitor-community/camera-preview` para renderizar o feed da câmera diretamente no app, sem abrir a interface nativa do iOS.

## Problema Identificado (Resolvido)

A experiência desejada é:
- **Clica no Scanner** → Câmera abre direto em tela cheia, com layout integrado ao design do app

## Diagnóstico Técnico

O `@capacitor/camera` (plugin padrão) sempre abre a **interface nativa do iOS** (UIImagePickerController ou PHPickerViewController). Isso é uma limitação do plugin - ele não oferece preview embutido.

Para ter um feed de câmera **dentro** do app no iOS, precisamos usar o plugin `@capacitor-community/camera-preview`, que renderiza o feed da câmera como uma view nativa por trás da WebView.

## Solução Proposta

### Opção Implementada: Camera Preview Plugin

Usar o `@capacitor-community/camera-preview` para:
- Mostrar feed de câmera em tela cheia direto ao abrir o Scanner
- Manter layout consistente com o design do Paddock (botões, watermark, etc.)
- Capturar foto sem sair do contexto do app

### Arquitetura

```text
┌─────────────────────────────────────────┐
│              WebView (React)            │
│  ┌─────────────────────────────────────┐│
│  │    UI Elements (buttons, overlay)   ││
│  │    - Botão X (fechar)               ││
│  │    - Botão captura                  ││
│  │    - Watermark PADDOCK              ││
│  │    - Corner guides                  ││
│  │         (transparent background)    ││
│  └─────────────────────────────────────┘│
│                    ↑                    │
│              (transparent)              │
│                    ↓                    │
│  ┌─────────────────────────────────────┐│
│  │     Native Camera Layer (behind)     ││
│  │        AVCaptureVideoPreviewLayer    ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

---

## Passos de Implementação

### 1. Instalar o Plugin Camera-Preview

Adicionar a dependência:
```json
"@capacitor-community/camera-preview": "^6.0.0"
```

### 2. Criar Hook `useNativeCameraPreview`

Novo hook para gerenciar o camera-preview em plataformas nativas:

```typescript
// src/hooks/useNativeCameraPreview.ts
import { CameraPreview, CameraPreviewOptions, CameraPreviewPictureOptions } from '@capacitor-community/camera-preview';
import { Capacitor } from '@capacitor/core';

export const useNativeCameraPreview = () => {
  const isNative = Capacitor.isNativePlatform();

  const start = async () => {
    if (!isNative) return false;
    
    const options: CameraPreviewOptions = {
      position: 'rear',
      toBack: true, // Renderiza atrás da WebView
      parent: 'camera-preview-container',
      className: 'camera-preview',
      enableZoom: true,
      disableAudio: true,
    };
    
    await CameraPreview.start(options);
    return true;
  };

  const stop = async () => {
    if (!isNative) return;
    await CameraPreview.stop();
  };

  const capture = async (): Promise<string | null> => {
    if (!isNative) return null;
    
    const options: CameraPreviewPictureOptions = {
      quality: 90,
    };
    
    const result = await CameraPreview.capture(options);
    return result.value ? `data:image/jpeg;base64,${result.value}` : null;
  };

  const flip = async () => {
    if (!isNative) return;
    await CameraPreview.flip();
  };

  return { isNative, start, stop, capture, flip };
};
```

### 3. Atualizar ScannerView para Usar Camera-Preview no iOS

Modificar o componente para:

a) **Adicionar container transparente** para o preview nativo aparecer por trás:
```tsx
<div 
  id="camera-preview-container" 
  className="fixed inset-0 z-0" 
  style={{ backgroundColor: 'transparent' }}
/>
```

b) **Usar background transparente** na WebView para ver a câmera por trás:
```tsx
// CSS para iOS nativo
.native-camera-mode {
  background-color: transparent !important;
}
```

c) **Inicializar camera-preview** no mount (iOS/Android):
```typescript
useEffect(() => {
  if (Capacitor.isNativePlatform()) {
    cameraPreview.start();
    setCameraActive(true);
    setIsInitializing(false);
    
    return () => {
      cameraPreview.stop();
    };
  }
}, []);
```

d) **Capturar foto** direto do preview (sem abrir interface nativa):
```typescript
const capturePhoto = async () => {
  const imageBase64 = await cameraPreview.capture();
  if (imageBase64) {
    setCapturedImage(imageBase64);
    analyzeImage(imageBase64);
  }
};
```

### 4. Configuração iOS Nativa

Adicionar no `ios/App/App/Info.plist` (já feito anteriormente):
- NSCameraUsageDescription
- NSPhotoLibraryUsageDescription
- NSPhotoLibraryAddUsageDescription

### 5. Manter Fallback para Web

No navegador web, continuar usando `getUserMedia` (fluxo atual funciona bem).

---

## Fluxo Final

```text
[iOS/Android]
Clica em Scanner → 
  CameraPreview.start() → 
    Feed aparece em tela cheia (atrás da WebView) →
      UI sobreposta (botões, watermark) →
        Toca no botão de captura →
          CameraPreview.capture() →
            Imagem capturada →
              Análise IA

[Web]
Clica em Scanner → 
  getUserMedia() →
    <video> mostra feed →
      Toca no botão de captura →
        canvas.drawImage() →
          Imagem capturada →
            Análise IA
```

---

## Arquivos a Modificar

1. **`package.json`** - Adicionar `@capacitor-community/camera-preview`
2. **`src/hooks/useNativeCameraPreview.ts`** - Novo hook para camera-preview
3. **`src/components/scanner/ScannerView.tsx`** - Usar camera-preview no iOS, background transparente
4. **`src/index.css`** - Estilos para modo câmera transparente

---

## Passos Pós-Implementação (Usuário)

1. `git pull`
2. `npm install`
3. `npx cap sync ios`
4. No Xcode: Adicionar permissões no `Info.plist` (se não feito)
5. Clean Build (⌘⇧K)
6. Run no device

---

## Resultado Esperado

- Câmera abre imediatamente em tela cheia ao entrar no Scanner
- Layout consistente com o design do Paddock (watermark, botões)
- Sem tela intermediária "Toque para abrir"
- Experiência fluida e imersiva como Instagram/TikTok
