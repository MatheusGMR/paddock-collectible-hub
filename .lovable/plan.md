# Corrigir proporção do scanner no iPhone

## Objetivo
Fazer a câmera do scanner usar captura 16:9, ocupar toda a tela do iPhone e remover a faixa inferior, sem o aumento causado pelas dimensões incorretas.

## Alterações
- Iniciar a câmera nativa explicitamente em 16:9 e zoom 1x.
- Usar as dimensões reais da área visível do aplicativo, sem misturar pixels físicos da tela com pixels da interface.
- Redimensionar a camada nativa após iniciar para cobrir toda a área, incluindo a região inferior.
- Solicitar 16:9 também na câmera web e manter o enquadramento em tela cheia.
- Preservar foco, captura, troca de câmera e gestos existentes.

## Validação
- Conferir o scanner nas dimensões de iPhone, sem faixa inferior.
- Confirmar enquadramento vertical 9:16 (equivalente ao 16:9 em retrato) e estado inicial em 1x.
- Verificar que os controles continuam alinhados e funcionais.

## Detalhes técnicos
A câmera nativa atualmente combina medidas CSS com resolução física do aparelho. Isso cria uma camada muito maior que a tela e resulta em recorte semelhante a zoom. A correção usa uma única unidade de medida e configura a sessão da câmera em 16:9 antes de fazê-la cobrir a viewport.
