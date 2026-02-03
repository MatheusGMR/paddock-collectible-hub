

# Plano: Corrigir Erros de Launch Screen e App Icon para iOS

## Contexto do Problema

Você recebeu dois erros de validação da App Store:
1. **Launch Screen inválido** - Apps para iPad com Multitasking precisam de um LaunchScreen.storyboard configurado
2. **App Icon com transparência** - O ícone não pode ter canal alpha

## Solução

Esses ajustes são **configurações nativas do Xcode** que precisam ser feitas **localmente** no seu Mac após exportar o projeto do Lovable.

---

## Passo a Passo

### 1. Configurar o LaunchScreen.storyboard

Abra o projeto iOS no Xcode (`ios/App/App.xcworkspace`) e edite o `LaunchScreen.storyboard`:

```text
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│            ┌───────────┐                │
│            │     P     │  ← Logo        │
│            │  Paddock  │    centralizado│
│            └───────────┘                │
│                                         │
│    Background: #0E1117 (dark theme)     │
│                                         │
└─────────────────────────────────────────┘
```

**No Xcode:**
1. Abra `ios/App/App/LaunchScreen.storyboard`
2. Selecione a View principal
3. Background Color: `#0E1117` (preto do tema Paddock)
4. Adicione um `UIImageView` centralizado
5. Coloque o logo do Paddock (sem transparência excessiva)
6. Constraints: centralizar horizontal e vertical

### 2. Verificar o Info.plist

Confirme que o `Info.plist` (`ios/App/App/Info.plist`) contém:

```xml
<key>UILaunchStoryboardName</key>
<string>LaunchScreen</string>
```

Se não existir, adicione esta entrada.

### 3. Corrigir o App Icon (Remover Transparência)

O ícone do Paddock atual (`paddock-logo.png`) pode ter canal alpha. Para corrigir:

**Opção A - Via Preview (Mac):**
1. Abra o ícone no Preview
2. File → Export
3. Desmarque "Alpha"
4. Salve como PNG

**Opção B - Via comando:**
```bash
# Remove alpha channel mantendo qualidade
convert paddock-logo.png -background "#0E1117" -flatten -alpha off AppIcon-1024.png
```

### 4. Atualizar o Asset Catalog

No Xcode, atualize `ios/App/App/Assets.xcassets/AppIcon.appiconset`:

1. Use o ícone sem transparência (1024x1024)
2. Gere todos os tamanhos necessários (use https://appicon.co)
3. Substitua os ícones no Asset Catalog

---

## Resumo das Ações Locais

| Arquivo | Ação |
|---------|------|
| `LaunchScreen.storyboard` | Configurar com background #0E1117 e logo centralizado |
| `Info.plist` | Confirmar `UILaunchStoryboardName` = `LaunchScreen` |
| `AppIcon.appiconset` | Substituir ícones por versões sem canal alpha |

---

## Nota Importante

Essas configurações são **nativas do Xcode** e precisam ser feitas localmente após:

1. Exportar o projeto para GitHub
2. Clonar localmente
3. Executar `npm install` e `npx cap sync`
4. Abrir no Xcode e fazer os ajustes acima

Após as correções, faça um novo build e archive para reenviar à App Store.

