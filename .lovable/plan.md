

# Plano: Simplificar o Uso de Câmera Nativa no Scanner

## Diagnóstico do Problema

O log do Xcode mostra um **loop infinito de re-renderização** no Scanner:

```text
[Scanner] Initializing camera...
[Scanner] Native camera permission: true
[Scanner] Cleanup: stopping camera
[Scanner] Initializing camera...   ← repete infinitamente
```

### Causa Raiz

O `useEffect` de inicialização da câmera (linhas 190-319) tem `nativeCamera` como dependência:

```javascript
useEffect(() => {
  const initCamera = async () => { ... };
  initCamera();
  return () => { cleanup... };
}, [toast, t, nativeCamera]); // ← PROBLEMA
```

O hook `useNativeCamera()` retorna um **novo objeto** a cada render, causando re-execuções infinitas do `useEffect`.

---

## Solução Proposta

### 1. Corrigir o Hook `useNativeCamera` para ser Estável

Usar `useMemo` e `useCallback` para garantir que o objeto retornado seja referenciado de forma estável.

**Arquivo:** `src/hooks/useNativeCamera.ts`

```typescript
import { useCallback, useMemo } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

export const useNativeCamera = () => {
  const isNative = Capacitor.isNativePlatform();

  const isAvailable = useCallback(() => isNative, [isNative]);

  const takePhoto = useCallback(async () => {
    if (!isNative) return null;
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        correctOrientation: true,
        width: 1280,
        height: 960,
      });
      if (!image.base64String) return null;
      return {
        base64Image: `data:image/${image.format || 'jpeg'};base64,${image.base64String}`,
        format: image.format || 'jpeg',
      };
    } catch (error) {
      console.error("[NativeCamera] Error:", error);
      return null;
    }
  }, [isNative]);

  // ... mesmo para pickFromGallery e checkPermissions

  return useMemo(() => ({
    isNative,
    isAvailable,
    takePhoto,
    pickFromGallery,
    checkPermissions,
  }), [isNative, isAvailable, takePhoto, pickFromGallery, checkPermissions]);
};
```

### 2. Simplificar o `useEffect` de Inicialização no ScannerView

Remover `nativeCamera` das dependências e usar uma ref ou importação direta para acessar as funções do Capacitor.

**Arquivo:** `src/components/scanner/ScannerView.tsx`

```typescript
// Usar o Camera direto do Capacitor para checagem, evitando dependência do hook
import { Camera } from "@capacitor/camera";

// ...

useEffect(() => {
  let mounted = true;
  
  const initCamera = async () => {
    if (!mounted) return;
    
    setIsInitializing(true);
    setCameraError(false);
    
    // Em plataforma nativa, usar câmera nativa diretamente
    if (Capacitor.isNativePlatform()) {
      try {
        const permissions = await Camera.checkPermissions();
        if (!mounted) return;
        
        if (permissions.camera === 'granted' || permissions.camera === 'prompt') {
          setUseNativeFallback(true);
          setCameraActive(false);
          setIsInitializing(false);
          return;
        }
      } catch (error) {
        console.error("[Scanner] Permission check error:", error);
      }
      
      if (mounted) {
        setCameraError(true);
        setIsInitializing(false);
      }
      return;
    }
    
    // Web: getUserMedia flow...
  };

  initCamera();

  return () => {
    mounted = false;
    // cleanup streams...
  };
}, []); // ← Sem dependências problemáticas
```

### 3. Separar Responsabilidades (Simplificação)

Criar uma estrutura mais clara onde:
- Inicialização roda **apenas uma vez** no mount
- Funções de captura são callbacks estáveis
- Não há múltiplos estados conflitantes

---

## Benefícios da Solução

| Antes | Depois |
|-------|--------|
| Loop infinito de re-render | Inicialização única no mount |
| `nativeCamera` muda a cada render | Referências estáveis com `useMemo/useCallback` |
| Múltiplas chamadas `Camera.checkPermissions` | Uma única verificação inicial |
| UI travada carregando | Transição imediata para modo nativo |

---

## Arquivos a Modificar

1. **`src/hooks/useNativeCamera.ts`** – Estabilizar retorno do hook com `useMemo`/`useCallback`
2. **`src/components/scanner/ScannerView.tsx`** – Simplificar `useEffect` de inicialização, remover dependências instáveis

---

## Seção Técnica

### Por que o loop acontece

```text
React render → useNativeCamera() retorna novo objeto → 
useEffect detecta mudança em dependência → 
executa initCamera → setState → re-render → 
useNativeCamera() retorna novo objeto → ∞
```

### Solução: Referência Estável

O `useMemo` no hook garante que o mesmo objeto seja retornado enquanto `isNative` não mudar (é estático).

O `useCallback` garante que as funções `takePhoto`, `pickFromGallery`, `checkPermissions` mantenham a mesma referência.

### Testes Necessários

Após a implementação:
1. Abrir o Scanner no iOS nativo
2. Verificar que o log mostra **apenas uma** inicialização
3. Verificar que o botão de captura abre a câmera nativa
4. Tirar foto e confirmar análise

