# Corrigir "Nenhum veículo identificado" no envio de várias fotos

## O que os registros mostram

No último teste com 4 fotos, o serviço de identificação respondeu para as 4 imagens, em uma única tentativa cada, com respostas de tamanho normal (cerca de 1.400 a 2.700 caracteres) e sem nenhum erro registrado. Não houve nenhuma tentativa de reforço, o que só acontece quando a resposta volta vazia.

Ou seja: a identificação provavelmente funcionou do lado do serviço, e o resultado se perdeu no app antes de chegar à tela. A causa exata ainda não está confirmada — por isso o primeiro passo do plano é confirmar, não adivinhar.

Dois pontos frágeis já visíveis no fluxo, que podem explicar a tela vermelha mesmo com respostas boas:

1. Fotos em que a pré-contagem devolveu zero são excluídas da identificação, mas continuam na lista e acabam contadas como "não identificadas" no fim.
2. Se o recorte da imagem ou a checagem de repetidos falhar, a foto inteira é marcada como erro, mesmo já tendo carrinho reconhecido.

## O que será feito

### 1. Confirmar a causa (primeiro passo)
- Registrar, para cada foto, o que voltou do serviço e o que sobrou depois de cada etapa do app (normalização, recorte, checagem de repetidos), para identificar exatamente onde o carrinho some.
- Reproduzir o envio de 4 fotos e ler esses registros antes de qualquer outra mudança.

### 2. Nunca perder um carrinho já reconhecido
- Se o recorte da foto falhar, usar a foto original e manter o resultado.
- Se a checagem de repetidos falhar, manter o resultado sem essa marcação.
- Uma foto só é considerada "não identificada" quando o serviço realmente não devolveu nenhum veículo.

### 3. Tratar corretamente as fotos sem contagem
- Fotos que a pré-contagem marcou com zero passam a ser identificadas mesmo assim (em vez de ficarem de fora), e só aparecem como falha se de fato nada for reconhecido.
- Fotos que o usuário deixou em zero de propósito são puladas em silêncio, sem entrar na tela de erro.

### 4. Mensagem de erro mais honesta
- Separar "não reconhecemos nada nesta foto" de "houve falha técnica ao processar", para o usuário saber se vale trocar a foto ou apenas tentar de novo.

## Detalhes técnicos

- `src/components/profile/batch-upload/useParallelProcessing.ts`: logs por foto em `invokeRemoteAnalysis`, `normalizeItemsFromResponse`, `itemsWithCrops` e `itemsWithDuplicateCheck`; garantir que erros de crop/duplicidade retornem o item original; distinguir erro de rede (status `error`) de resposta vazia (status `success` com `results: []`).
- `src/components/profile/PhotoUploadSheet.tsx`: `handleConfirmAndAnalyze` deixa de filtrar por `vehicleCount > 0` (envia todas, exceto as zeradas manualmente via `manuallyAdjusted`); `consolidateResults` passa a classificar como falha somente `status === "error"` ou ausência de resultado após `autoRecover`; ajuste do texto da tela `retry-failed`.
- Após a correção, novo teste com 4 fotos e leitura dos logs da função `analyze-collectible` para confirmar que cada foto entrega itens até o fim.
