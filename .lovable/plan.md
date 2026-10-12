# Link de instalação do Paddock

## O que é possível
- Nenhum link instala o app sozinho, sem nenhum toque. Os celulares não permitem isso por segurança.
- **Android (Chrome):** dá para chegar bem perto. O link abre uma página com o botão "Instalar Paddock". Com um toque, o próprio celular mostra a confirmação de instalação.
- **iPhone (Safari):** a Apple não deixa nenhum site instalar sozinho. A página mostra um passo a passo com imagens: Compartilhar, depois "Adicionar à Tela de Início".

## O que será feito
1. Nova página **paddockonline.com/instalar**, que você pode compartilhar no WhatsApp, Instagram ou como QR code.
2. A página descobre qual é o aparelho:
   - Android: botão "Instalar Paddock" com um toque.
   - iPhone no Safari: guia visual em 2 passos, com uma seta apontando para o botão Compartilhar.
   - iPhone em outro navegador (Instagram, WhatsApp, Chrome): aviso "Abra no Safari" e botão para copiar o link.
   - Se o app já estiver instalado: botão "Abrir Paddock".
   - Computador: QR code para abrir a página no celular.
3. Depois de instalar, a pessoa vai direto para o login.
4. Estilo escuro, minimalista e todo em português.
5. Botão "Compartilhar link de instalação" no portal Admin, com o link e o QR code.

## Detalhes técnicos
- Rota pública `/instalar` em `App.tsx`, fora das verificações de login, assinatura e onboarding.
- `src/pages/Install.tsx`: guardar o evento `beforeinstallprompt`, chamar `prompt()` quando o botão for tocado e ouvir `appinstalled`. Detectar o modo standalone com `matchMedia('(display-mode: standalone)')` e `navigator.standalone`. Identificar iOS, Safari e navegadores embutidos pelo userAgent.
- Gerar o QR code com uma biblioteca leve (`qrcode.react`).
- Não mudar nada no service worker atual nem no manifest.
