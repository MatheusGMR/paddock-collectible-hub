

# Plano: Resolver Definitivamente o Erro "Missing package product 'CapApp-SPM'"

## Diagnóstico Final

O erro persiste porque:
1. O plugin `@aparajita/capacitor-biometric-auth` **não tem suporte a SPM** (confirmado pelo warning: "does not have a Package.swift")
2. Isso pode estar causando instabilidade no gerenciamento de pacotes SPM do Xcode
3. A solução mais confiável é **migrar para CocoaPods**

---

## Solução: Recriar iOS com CocoaPods (Mais Estável)

### Pré-requisito: Instalar CocoaPods (se não tiver)

No Terminal:
```bash
sudo gem install cocoapods
```

Se pedir senha, digite a senha do seu Mac.

---

### Passo a Passo Completo

**1. Feche o Xcode completamente**

**2. Limpe caches do Xcode**
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

**3. Delete a pasta iOS atual**
```bash
cd /Users/matheusroldan/Documents/paddock-collectible-hub/paddock-collectible-hub
rm -rf ios
```

**4. Adicione iOS com CocoaPods (não SPM)**
```bash
npx cap add ios
```

Sem a flag `--packagemanager SPM`, ele usa CocoaPods por padrão.

**5. Sincronize**
```bash
npx cap sync ios
```

**6. Instale os Pods**
```bash
cd ios/App
pod install
cd ../..
```

**7. Abra o WORKSPACE (não o xcodeproj)**
```bash
open ios/App/App.xcworkspace
```

---

### Importante: Abrir o Arquivo Correto

Com CocoaPods, você deve abrir:
- **App.xcworkspace** (correto)
- ~~App.xcodeproj~~ (errado - vai dar erro)

---

### No Xcode

1. **Product → Clean Build Folder** (⌘⇧K)
2. **Product → Build** (⌘B)

---

## Por Que CocoaPods é Melhor Para Este Projeto

| Aspecto | SPM | CocoaPods |
|---------|-----|-----------|
| Plugin Biometria | Não suportado | Suportado |
| Estabilidade | Caches problemáticos | Mais maduro |
| Compatibilidade | Alguns plugins falham | 99% dos plugins funcionam |

---

## Resumo dos Comandos

```bash
# 1. Instalar CocoaPods (se necessário)
sudo gem install cocoapods

# 2. Na pasta do projeto
cd /Users/matheusroldan/Documents/paddock-collectible-hub/paddock-collectible-hub

# 3. Limpar e recriar
rm -rf ~/Library/Developer/Xcode/DerivedData/*
rm -rf ios
npx cap add ios
npx cap sync ios

# 4. Instalar Pods
cd ios/App
pod install
cd ../..

# 5. Abrir no Xcode (WORKSPACE!)
open ios/App/App.xcworkspace
```

---

## Se o `pod install` Falhar

Se aparecer erro de CocoaPods, pode ser necessário:
```bash
pod repo update
pod install
```

Ou se o pod não for encontrado:
```bash
brew install cocoapods
```

