# Landing page Paddock (paddockonline.com/conheca)

Página pública, em PT-BR, com a identidade do Paddock (fundo escuro #0E1117, brilho azul/ciano, estilo Apple/Tesla, sem visual infantil). Aberta sem login, pronta para links de anúncios e redes sociais.

## Storytelling (seções em ordem)

1. **Abertura** — logo Paddock, frase forte ("Sua coleção merece mais do que uma prateleira"), foto cinematográfica de um carrinho em miniatura sob luz azul, botões App Store / Android / Instalar.
2. **A dor do colecionador** — 4 imagens com frase curta cada:
   - caixas e prateleiras lotadas, sem saber o que se tem;
   - planilhas e anotações perdidas;
   - não saber se uma peça é rara ou quanto vale;
   - colecionar sozinho, sem com quem compartilhar.
3. **A virada** — transição de escuro para o brilho azul: "E se bastasse apontar a câmera?"
4. **A experiência mágica** — passos com imagem/mockup de celular:
   - Capture: aponte e fotografe, inclusive vários de uma vez;
   - Identifique em segundos: marca, modelo, ano, fabricante, origem;
   - Índice de raridade certificado: critérios e nota (raridade, exclusividade, estado, embalagem, fabricante, idade, escala);
   - Quanto vale: valor aproximado de cada colecionável em reais, logo após a captura;
   - Sua coleção em valor e raridade: total, ranking, organização por marca/país/ano.
5. **Rede social do colecionador** — feed, novidades, ver coleções de outros, mensagens, mercado para comprar e vender.
6. **Números/prova** — destaques curtos (ex.: "Identificação em segundos", "Índice em 6 critérios").
7. **Chamada final** — "Comece sua coleção no Paddock" + botões de download.

Botões de download aparecem na abertura, no meio (após a experiência) e no final, além de uma barra fixa discreta no celular.

## Botões de download

- **App Store**: link do app iOS (preciso do link oficial; até lá aponta para /instalar).
- **Android**: leva para paddockonline.com/instalar, que já instala com um toque.
- O botão se adapta ao aparelho: no iPhone destaca App Store, no Android destaca "Instalar no Android", no computador mostra os dois + QR code.

## Imagens

Geradas com qualidade alta no estilo da marca: miniaturas em luz cinematográfica, colecionador com caixas bagunçadas, celular escaneando um carrinho, mockups de telas. Animações suaves ao rolar (surgimento, leve parallax), sem exageros.

## Detalhes técnicos

- Nova rota pública `/conheca` em `src/pages/Landing.tsx`, registrada antes do bloco protegido em `App.tsx` e fora de onboarding/assinatura/prompt de push.
- Componentes em `src/components/landing/` (Hero, PainSection, MagicSteps, SocialSection, DownloadButtons, StickyCTA).
- Imagens em `src/assets/landing/` via geração de imagem; carregamento sob demanda.
- Animações com IntersectionObserver + classes Tailwind; tokens semânticos do design system.
- Detecção de plataforma reaproveitando a lógica de `src/pages/Install.tsx`.
- Meta tags OG próprias da página (título/descrição).

## Pergunta em aberto

- Link oficial do app na App Store (se já publicado).
