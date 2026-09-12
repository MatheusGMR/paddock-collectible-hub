# Corrigir "9 imagens não identificadas" após a pré-avaliação

## O que está acontecendo

A contagem rápida e a análise completa usam caminhos diferentes na mesma função de IA, e o caminho da análise está muito mais "cego" que o da contagem:

- Na contagem, a imagem é enviada com nível de detalhe automático — por isso ela encontra os carrinhos nas prateleiras.
- Na análise completa, a imagem é sempre enviada em detalhe baixo e ainda mais reduzida antes do envio. Em fotos de estante (carrinho pequeno dentro de um quadro grande), a IA não reconhece nada e devolve lista vazia.
- Uma lista vazia não é erro técnico: a tela trata a foto como "não identificada". Daí as 9 imagens caírem todas na tela vermelha, mesmo tendo sido contadas corretamente antes.

Dois agravantes confirmados no código:

1. O modo lote desliga qualquer segunda tentativa; quando a primeira volta vazia, não há reforço nenhum.
2. O plano B (recortar cada veículo confirmado e analisar separadamente) reenvia o recorte sem informar que ali existe um carro confirmado, então costuma voltar vazio também.

## O que será feito

### 1. Enviar a foto com qualidade suficiente na análise
- Usar detalhe alto quando a imagem tem veículos confirmados pelo usuário (mais de um carro, foto de estante).
- Elevar o tamanho máximo enviado na análise em lote, mantendo compressão para não pesar.

### 2. Respeitar a contagem confirmada
- Quando o usuário confirmou N veículos, a análise não pode voltar vazia sem tentar de novo: uma segunda tentativa com modelo mais forte é feita antes de declarar "não identificado".
- Aumentar o limite de resposta proporcional ao número de veículos, para que fotos com 3+ carros não tenham o JSON cortado no meio.

### 3. Corrigir o plano B por recorte
- Cada recorte passa a ser enviado já informando "há 1 veículo confirmado aqui", que é o que destrava a identificação.
- Os recortes só são descartados se realmente voltarem vazios após essa tentativa.

### 4. Tela de falha mais útil
- Mostrar os resultados que deram certo junto com as imagens que falharam, em vez de só a lista vermelha.

## Detalhes técnicos

- `supabase/functions/analyze-collectible/index.ts`: `imageDetail` deixa de ser fixo em `"low"` (usar `"high"` quando `vehicleCount > 0`); `max_tokens` escalonado por `confirmedCount`; quando `skipFallback` e o resultado vier `identified=false`/`items: []` com `confirmedCount > 0`, executar uma segunda passada no modelo de reforço antes de responder.
- `src/components/profile/batch-upload/useParallelProcessing.ts`: subir `maxDim`/`quality` da análise com contagem confirmada; no fallback por recorte, passar `confirmedCount: 1` e `skipVehicleDetectionValidation`.
- `src/components/profile/PhotoUploadSheet.tsx`: na fase `retry-failed`, exibir também os itens já consolidados.
- Redeploy da edge function e teste com um lote de várias fotos de estante.
