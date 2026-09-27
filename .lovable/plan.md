# Scanner sem aparência de zoom e informações especiais na captura única

## Objetivo
Ao abrir o scanner, mostrar a câmera em 1x com o enquadramento mais próximo possível do aplicativo Câmera do iPhone. A imagem deve preencher toda a tela, como você escolheu. Na revisão da captura única, permitir informar características especiais que ajustam a raridade antes de adicionar o carrinho.

## Alterações
1. Revisar o enquadramento do preview nativo e da câmera web: conferir o tamanho real da área visível, a proporção 16:9 e onde a imagem sofre recortes adicionais. Remover ampliações desnecessárias; manter somente o corte lateral inevitável para preencher por completo a tela mais alta do iPhone. Iniciar sempre em zoom 1x e alinhar o indicador/gesto de zoom ao zoom efetivo da câmera, sem alterar foco, captura e troca de câmera.
2. Na revisão da captura única, oferecer **Informações especiais**: edição especial/licenciada, numerada/tiragem limitada, unidade única, país de importação e observação. Manter a pontuação dos critérios calculada pelo sistema, sem edição manual de notas.
3. Guardar essas informações junto ao item tanto em **Adicionar à coleção** quanto em **Adicionar e publicar**, recalcular a raridade e atualizar a pontuação exibida. Se o recálculo falhar, manter as informações salvas e oferecer nova tentativa no detalhe do carrinho.

## Validação
- Comparar preview inicial 1x e área visível em tamanhos de iPhone, sem faixa inferior, e verificar que controles continuam clicáveis. A comparação exata com a câmera física precisará de teste no próprio iPhone.
- Capturar um carrinho, preencher informações especiais, adicionar pelas duas ações e verificar no detalhe da coleção que os dados e a pontuação atualizada aparecem; testar falha e nova tentativa.

## Detalhes técnicos
- `useNativeCameraPreview.ts`, `ScannerView.tsx` e regras do preview em `src/index.css`: investigar `AVCaptureVideoPreviewLayer` do plugin, que usa `resizeAspectFill` apesar de receber 16:9; CSS `object-fit: cover` e o vídeo web também recortam. Não confundir recorte de tela com zoom óptico/digital.
- `ResultCarousel.tsx` recebe contexto de raridade por resultado; reutilizar o formato de `user_context` existente em `CollectibleDetailCard.tsx`. `ScannerView.tsx` passa o contexto aos dois caminhos de inclusão; `addToCollection` persiste esse contexto em `user_collection`, seguido da função existente `recalculate-index` para atualizar score e breakdown. Não é necessária uma nova tabela.
