
# Plano: Corrigir Tela Preta do Scanner no iOS (camera-preview)

## Diagnóstico Detalhado

### O Que Está Acontecendo

O plugin `@capacitor-community/camera-preview` com `toBack: true` renderiza a câmera **atrás da WebView**. Os logs confirmam que a câmera inicia corretamente:

```
[CameraPreview] Camera preview started successfully
[Scanner] Camera-preview started successfully
```

Porém, a WebView do iOS permanece **opaca**, bloqueando a visualização da câmera.

### Por Que a Opção A Não Funcionou

O código adicionado ao `AppDelegate.swift`:
```swift
DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
    if let vc = self.window?.rootViewController as? CAPBridgeViewController {
        vc.webView?.isOpaque = false
        // ...
    }
}
```

**Não funciona porque:**

1. **Timing inadequado**: A WebView pode não estar completamente carregada em 0.1s
2. **UIScene lifecycle**: No iOS 13+, a `window` é gerenciada pelo `SceneDelegate`, não pelo `AppDelegate`. O warning nos logs confirma isso:
   ```
   `UIScene` lifecycle will soon be required.
   ```
3. **A `self.window` pode estar `nil`** no momento em que o código executa

---

## Solução Corrigida

### Parte 1: Configuração no Capacitor (Mais Simples)

Adicionar `backgroundColor` transparente no `capacitor.config.ts` força o Capacitor a configurar `isOpaque = false` automaticamente:

```typescript
const config: CapacitorConfig = {
  appId: 'app.lovable.ec82142056a94147adde54a8d514aaac',
  appName: 'paddock-collectible-hub',
  webDir: 'dist',
  ios: {
    backgroundColor: '#00000000' // Transparente (RGBA com alpha = 0)
  }
};
```

**Problema**: Esta abordagem pode causar um flash branco durante o carregamento em outras telas.

### Parte 2: Modificação Nativa Corrigida (Recomendada)

Usar o método `viewDidAppear` ou `viewWillLayoutSubviews` para garantir que a WebView esteja pronta:

**Arquivo: `ios/App/App/AppDelegate.swift`**

```swift
import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Registrar para notificação quando a WebView carregar
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(webViewDidLoad),
            name: NSNotification.Name("capacitorViewDidLoad"),
            object: nil
        )
        return true
    }
    
    @objc func webViewDidLoad() {
        // Configurar WebView transparente após carregamento completo
        DispatchQueue.main.async {
            guard let window = UIApplication.shared.windows.first,
                  let rootVC = window.rootViewController as? CAPBridgeViewController else {
                return
            }
            rootVC.webView?.isOpaque = false
            rootVC.webView?.backgroundColor = .clear
            rootVC.webView?.scrollView.backgroundColor = .clear
        }
    }
    
    // ... resto dos métodos permanecem iguais ...
}
```

**Problema**: A notificação `capacitorViewDidLoad` não existe por padrão.

### Parte 3: Solução Definitiva - Subclasse do ViewController

Criar uma subclasse que configura a transparência após `viewDidLoad`:

**Arquivo a criar: `ios/App/App/TransparentWebViewController.swift`**

```swift
import UIKit
import Capacitor

class TransparentWebViewController: CAPBridgeViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Configurar WebView como transparente para camera-preview
        webView?.isOpaque = false
        webView?.backgroundColor = .clear
        webView?.scrollView.backgroundColor = .clear
    }
    
    // Garantir transparência também após layout
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        
        // Reforçar configuração (caso seja resetada)
        webView?.isOpaque = false
        webView?.backgroundColor = .clear
        webView?.scrollView.backgroundColor = .clear
    }
}
```

**Arquivo a modificar: `ios/App/App/AppDelegate.swift`**

```swift
import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Criar window com ViewController customizado
        window = UIWindow(frame: UIScreen.main.bounds)
        let vc = TransparentWebViewController()
        window?.rootViewController = vc
        window?.makeKeyAndVisible()
        
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
```

---

## Passos para Implementar

### Passo 1: Criar o ViewController Customizado

1. Abra o projeto no Xcode:
   ```bash
   open ios/App/App.xcworkspace
   ```

2. No Xcode, clique com botão direito na pasta `App` → **New File...** → **Swift File**

3. Nome: `TransparentWebViewController`

4. Cole o código do ViewController acima

5. Se perguntar sobre criar Bridging Header, clique **Don't Create** (não é necessário)

### Passo 2: Modificar o AppDelegate

1. Abra `ios/App/App/AppDelegate.swift`

2. Substitua o conteúdo pelo código do AppDelegate acima

### Passo 3: Rebuild

```bash
# No terminal:
npx cap sync ios

# No Xcode:
# 1. Product → Clean Build Folder (⌘⇧K)
# 2. Delete o app do iPhone
# 3. Run (⌘R)
```

---

## Verificação

Após o rebuild, abra o scanner no app. Você deverá ver:

1. ✅ A interface do scanner (botões, marca d'água)
2. ✅ O feed da câmera em tempo real por trás da interface
3. ✅ Sem tela preta

---

## Arquivos Modificados (Resumo)

| Arquivo | Ação |
|---------|------|
| `ios/App/App/TransparentWebViewController.swift` | **CRIAR** - Subclasse com WebView transparente |
| `ios/App/App/AppDelegate.swift` | **MODIFICAR** - Usar o ViewController customizado |

---

## Alternativa: Configuração via capacitor.config.ts

Se preferir uma solução sem modificar código Swift, adicione ao `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'app.lovable.ec82142056a94147adde54a8d514aaac',
  appName: 'paddock-collectible-hub',
  webDir: 'dist',
  ios: {
    backgroundColor: '#00000000' // RGBA com alpha transparente
  }
};
```

Depois execute:
```bash
npm run build
npx cap sync ios
# Rebuild no Xcode
```

**Nota**: Esta alternativa pode causar flash branco durante carregamento inicial do app.
