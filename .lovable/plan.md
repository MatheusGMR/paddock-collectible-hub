# Corrigir erro após "Analisar" no envio de várias fotos

## O que os registros mostram

Na sua última tentativa (6 fotos, 9 veículos), o serviço de identificação respondeu com sucesso para **todas as 6 fotos**, sem nenhum erro, e nenhuma nova tentativa foi disparada depois disso. Ou seja: os carrinhos foram reconhecidos, e a tela vermelha apareceu por uma falha dentro do aplicativo, já depois da identificação.

## Causa mais provável

Logo após concluir a identificação, o app salva os resultados no armazenamento do navegador para não perder o trabalho. Esses resultados incluem a imagem recortada de cada carrinho em alta qualidade. Com 9 carrinhos, o volume ultrapassa o limite do navegador do iPhone, a gravação falha e essa falha derruba todo o fluxo: o app cai no tratamento de erro genérico, que marca **todas** as fotos como "não identificadas", mesmo tendo os resultados em mãos.

Isso explica exatamente o que você viu: erro imediato, todas as fotos marcadas, e nenhuma nova tentativa de análise.

## O que será feito

1. Tornar o salvamento à prova de falhas: se o armazenamento estourar, o app grava uma versão leve (sem as imagens grandes) e, se ainda assim falhar, simplesmente segue em frente sem salvar — nunca derrubando a revisão.
2. Reduzir o peso do que é guardado: as imagens salvas passam a ser versões compactas, o suficiente para reabrir a revisão depois.
3. Blindar o tratamento de erro: se algo inesperado acontecer depois da identificação, o app mostra os carrinhos já reconhecidos em vez de marcar tudo como falha.
4. Registrar um aviso técnico quando o salvamento falhar, para diagnóstico futuro.

## Detalhes técnicos

- `useBatchPersistence.saveResults`: envolver `localStorage.setItem` em try/catch; no `QuotaExceededError`, tentar novamente com `results` sem `croppedImage`/`existingItemImage`/`realCarPhotos`; se falhar de novo, limpar a chave e apenas manter o estado em memória.
- Gerar miniatura comprimida (máx. ~512 px, qualidade ~0,6) para o `croppedImage` persistido, mantendo a imagem original em memória para exibição na revisão.
- `runFullAnalysis` em `PhotoUploadSheet.tsx`: mover `saveResults` para fora do bloco que decide o estado, e no `catch` usar os resultados já consolidados de `processedQueue` em vez de marcar todas as mídias como falhas.
- Verificação: `tsgo` + vitest, e reteste manual com 6 fotos.
