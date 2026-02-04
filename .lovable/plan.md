
# ✅ Plano Aprovado: Corrigir Tela Escura no Scanner iOS

**Status:** Aprovado - Aguardando implementação manual no Xcode

---

## Instruções Rápidas

### Opção A: Alternativa Simples (Recomendada)

Edite apenas o `ios/App/App/AppDelegate.swift`:

```swift
import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        // Configurar WebView transparente para camera-preview
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            if let vc = self.window?.rootViewController as? CAPBridgeViewController {
                vc.webView?.isOpaque = false
                vc.webView?.backgroundColor = .clear
                vc.webView?.scrollView.backgroundColor = .clear
            }
        }
        
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}
}
```

### Opção B: Subclasse Dedicada

1. **Criar** `ios/App/App/CameraPreviewViewController.swift`:

```swift
import UIKit
import Capacitor

class CameraPreviewViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.isOpaque = false
        webView?.backgroundColor = .clear
        webView?.scrollView.backgroundColor = .clear
    }
}
```

2. **Modificar** `ios/App/App/AppDelegate.swift`:

```swift
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    window = UIWindow(frame: UIScreen.main.bounds)
    let vc = CameraPreviewViewController()
    window?.rootViewController = vc
    window?.makeKeyAndVisible()
    return true
}
```

---

## Após Implementar

```bash
# No Xcode:
# 1. Product → Clean Build Folder (⌘⇧K)
# 2. Delete o app do iPhone
# 3. Run (⌘R)
```

---

## Verificação

Após rebuild, o scanner deve mostrar o feed da câmera em vez de tela preta.
