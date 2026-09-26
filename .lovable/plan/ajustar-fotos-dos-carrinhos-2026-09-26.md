# Ajustar fotos dos carrinhos

## Experiência

- Ao tocar na foto do resultado individual, de cada carrinho no envio múltiplo ou do card aberto pela grade, abrir o mesmo editor de imagem. No perfil de outra pessoa, manter apenas a visualização, sem edição.
- Exibir a foto original no editor, com enquadramento retangular, gesto para mover, controle de tamanho/zoom e ajuste de margem para caber o carrinho inteiro. Mostrar imediatamente como a imagem ficará no card; oferecer **Restaurar**, **Cancelar** e **Salvar**.
- Ao salvar durante a identificação, atualizar só o carrinho selecionado, sem alterar os demais nem reiniciar a análise; a foto ajustada deve ser a usada em **Adicionar à Coleção** e **Adicionar e Publicar**.
- No card de um carrinho já salvo, atualizar sua foto e a miniatura da grade assim que o salvamento for confirmado. Se falhar, manter a imagem anterior e mostrar o motivo.

## Fotos antigas

- Preservar separadamente a foto original para novos carrinhos, permitindo reajustes futuros sem perder área fora do recorte. Os itens antigos não têm uma cópia separada da foto original; nesses casos, abrir a melhor imagem já salva e avisar quando não houver mais área externa recuperável, com opção de escolher outra foto do aparelho.
  &nbsp;

## Detalhes técnicos

- Criar um editor compartilhado de enquadramento 4:3, com exportação JPEG de boa qualidade, limites que evitem canvas vazio e compatibilidade com toque no iPhone. Aproveitar apenas os padrões úteis do editor de avatar, sem sua máscara circular.
- Ligar o editor ao `ResultCarousel`, ao `BatchCarouselView`/`PhotoUploadSheet` e ao `CollectibleDetailCard`. Atribuir a cada resultado do lote sua foto de origem (`mediaId`), mantendo estado por carrinho e evitando que imagens grandes interrompam a revisão ao exceder o armazenamento local.
- Guardar a foto original em armazenamento durável quando o item for incluído, associá-la ao item da coleção e salvar a versão ajustada em `image_url`; para fotos já existentes, usar `image_url` como origem de edição quando não existir original. Restringir as alterações ao proprietário, sem editar coleções visitadas.
- Atualizar a grade e a lista após a edição; verificar os três caminhos, inclusive vários carrinhos na mesma foto, cancelamento, falha no envio e visualização em iPhone.