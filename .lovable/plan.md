
# Plano: Preparação para Submissão na App Store

O app Paddock está rodando no iPhone físico. Agora vamos preparar tudo para a submissão na App Store.

---

## Etapa 1: Gerar App Icons (Ícones do App)

A Apple exige múltiplos tamanhos de ícone. Usando o logo existente (`paddock-logo.png`), você precisará gerar os seguintes tamanhos:

| Tamanho | Uso |
|---------|-----|
| 1024x1024 | App Store |
| 180x180 | iPhone (60pt @3x) |
| 120x120 | iPhone (60pt @2x, 40pt @3x) |
| 87x87 | iPhone (29pt @3x) |
| 80x80 | iPhone (40pt @2x) |
| 60x60 | iPhone (20pt @3x) |
| 58x58 | iPhone (29pt @2x) |
| 40x40 | iPhone (20pt @2x) |

**Importante**: Todos os ícones devem ser **sem canal alfa (transparência)** - exatamente como já mencionado na memória do projeto.

**Ferramenta recomendada**: [App Icon Generator](https://appicon.co/) - faça upload do logo 1024x1024 e ele gera todos os tamanhos.

---

## Etapa 2: Configurar Launch Screen (Tela de Abertura)

Conforme a memória do projeto, a Apple exige configuração via storyboard:

1. No Xcode, abra `ios/App/App/Base.lproj/LaunchScreen.storyboard`
2. Configure:
   - **Fundo**: Cor `#0E1117` (o tema escuro do Paddock)
   - **Logo**: Centralizado na tela
3. Isso é necessário para atender aos requisitos de multitarefa do iPad

---

## Etapa 3: Remover Configuração de Desenvolvimento

Antes de submeter, remova a configuração de hot-reload do `capacitor.config.ts`:

```typescript
// REMOVER esta seção antes de submeter:
"server": {
  "url": "...",
  "cleartext": true
}
```

Deixar apenas:
```typescript
const config: CapacitorConfig = {
  appId: 'com.matheusgmr.paddock',
  appName: 'Paddock',
  webDir: 'dist'
};
```

---

## Etapa 4: Configurar App Store Connect

No [App Store Connect](https://appstoreconnect.apple.com):

1. **Criar novo app**:
   - Bundle ID: `com.matheusgmr.paddock`
   - Nome: Paddock
   - Idioma principal: Português (Brasil) ou English

2. **Informações obrigatórias**:
   - Screenshots (6.7" e 5.5" obrigatórios)
   - Descrição do app
   - Palavras-chave
   - Categoria: Social Networking ou Lifestyle
   - Política de Privacidade URL
   - Classificação etária

3. **Screenshots necessárias**:
   - iPhone 6.7" (1290 x 2796 px) - iPhone 15 Pro Max
   - iPhone 5.5" (1242 x 2208 px) - iPhone 8 Plus

---

## Etapa 5: Build e Upload

No terminal e Xcode:

```bash
# 1. Build de produção
npm run build

# 2. Sincronizar com iOS
npx cap sync ios

# 3. Abrir Xcode
npx cap open ios
```

No Xcode:
1. Selecione **Any iOS Device (arm64)** como destino
2. **Product → Archive**
3. Após o archive, clique em **Distribute App**
4. Escolha **App Store Connect**
5. Faça upload

---

## Etapa 6: Submeter para Revisão

Após o upload:
1. No App Store Connect, selecione o build
2. Preencha todas as informações
3. Submeta para revisão (geralmente 24-48h)

---

## Resumo de Ações Necessárias

| Ação | Onde |
|------|------|
| Gerar ícones sem alfa | appicon.co + Xcode |
| Configurar LaunchScreen | Xcode (storyboard) |
| Remover server.url | capacitor.config.ts (local) |
| Criar app no App Store Connect | appstoreconnect.apple.com |
| Capturar screenshots | Simulador ou iPhone |
| Archive e Upload | Xcode |

---

## Seção Técnica

### Verificação do Bundle ID
```bash
# Confirmar que está correto no projeto iOS
cat ios/App/App.xcodeproj/project.pbxproj | grep PRODUCT_BUNDLE_IDENTIFIER
# Deve mostrar: com.matheusgmr.paddock
```

### Versão do App
No Xcode, em **TARGETS → App → General**:
- **Version**: 1.0.0 (ou sua versão)
- **Build**: 1 (incrementar a cada upload)

### Signing & Capabilities
Em **TARGETS → App → Signing & Capabilities**:
- Selecione seu Team (Apple Developer Account)
- Ative **Automatically manage signing**
