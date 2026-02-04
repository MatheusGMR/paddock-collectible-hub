
# Plano: Corrigir Tela Escura no Scanner (camera-preview iOS)

## Diagnóstico

O problema é que o plugin `@capacitor-community/camera-preview` com a opção `toBack: true` renderiza a câmera **atrás da WebView**. Para que a câmera seja visível, a WebView precisa ter fundo transparente. 

Os logs mostram que a câmera está iniciando corretamente:
```
[CameraPreview] Camera preview started successfully
[Scanner] Camera-preview started successfully
```

Porém a WebView está **opaca por padrão** no iOS, bloqueando a visualização da câmera.

## Solução em Duas Partes

### Parte 1: Configuração Nativa iOS (Obrigatória)

Criar uma subclasse do `CAPBridgeViewController` para configurar a WebView como transparente quando necessário.

**Arquivo a criar: `ios/App/App/CameraPreviewViewController.swift`**

```swift
import UIKit
import Capacitor

class CameraPreviewViewController: CAPBridgeViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Configurar WebView como transparente para camera-preview funcionar com toBack:true
        webView?.isOpaque = false
        webView?.backgroundColor = .clear
        webView?.scrollView.backgroundColor = .clear
    }
}
```

**Arquivo a modificar: `ios/App/App/AppDelegate.swift`**

Alterar para usar o novo ViewController:

```swift
import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        window = UIWindow(frame: UIScreen.main.bounds)
        let vc = CameraPreviewViewController()
        window?.rootViewController = vc
        window?.makeKeyAndVisible()
        
        return true
    }
    
    // ... resto dos métodos permanecem iguais
}
```

### Parte 2: Verificar CSS (Já Implementado)

O CSS em `src/index.css` já tem a configuração correta:
```css
.native-camera-mode {
  background-color: transparent !important;
}

.native-camera-mode * {
  background-color: transparent !important;
}
```

E o componente `ScannerView.tsx` aplica a classe corretamente:
```tsx
<div className={`fixed inset-0 z-50 flex flex-col ${useCameraPreview ? 'native-camera-mode' : 'bg-background'}`}>
```

## Passos para Implementar

1. **Abra o projeto iOS no Xcode**:
   ```bash
   open ios/App/App.xcworkspace
   ```

2. **Crie um novo arquivo Swift** (File → New → File → Swift File):
   - Nome: `CameraPreviewViewController.swift`
   - Adicione o código do ViewController personalizado

3. **Modifique o `AppDelegate.swift`** existente para usar o novo ViewController

4. **Limpe e reconstrua**:
   - Product → Clean Build Folder (⌘⇧K)
   - Delete o app do iPhone
   - Run (⌘R)

## Alternativa Mais Simples

Se preferir não criar arquivos Swift, você pode modificar diretamente o `AppDelegate.swift` existente:

```swift
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // Configurar WebView transparente após o carregamento
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
        if let vc = self.window?.rootViewController as? CAPBridgeViewController {
            vc.webView?.isOpaque = false
            vc.webView?.backgroundColor = .clear
            vc.webView?.scrollView.backgroundColor = .clear
        }
    }
    return true
}
```

## Por Que Isso é Necessário

| Camada | Comportamento Padrão | O Que Precisamos |
|--------|---------------------|------------------|
| Camera (nativa) | Renderiza atrás da WebView | ✓ Correto |
| WebView | Fundo opaco (branco/preto) | Fundo transparente |
| HTML/CSS | Pode ser transparente | ✓ Já configurado |

Sem a configuração nativa, a WebView bloqueia a visualização da câmera mesmo com CSS transparente.

## Resumo dos Comandos

```bash
# 1. Abrir no Xcode
open ios/App/App.xcworkspace

# 2. Após modificar os arquivos Swift:
#    - Product → Clean Build Folder (⌘⇧K)
#    - Delete app do iPhone
#    - Run (⌘R)
```
