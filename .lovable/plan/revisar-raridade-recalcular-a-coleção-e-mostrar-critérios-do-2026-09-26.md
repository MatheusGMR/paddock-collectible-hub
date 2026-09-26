# Revisar raridade, recalcular a coleção e mostrar critérios do score

## Por que o Cadillac do Elvis ficou "menos raro"
- A regra atual mede raridade só por "disponibilidade no Brasil" (45 pts), sem considerar tiragem, edição especial, série licenciada ou unidade única.
- A IA só vê a foto: não sabe que foi comprado nos EUA nem que é peça única.
- Dos 133 itens salvos, 21 não têm o detalhamento dos critérios — por isso, em alguns, tocar no score não mostra nada.

## Novos critérios (100 pts)
| Critério | Antes | Novo | O que mede |
|---|---|---|---|
| Raridade / tiragem | 45 | 35 | Edição limitada, numerada, chase, Super Treasure Hunt, unidade única |
| Exclusividade / licença | — | 15 | Edição especial, homenagem (Elvis, filmes, pilotos), importado sem venda no Brasil |
| Estado | 20 | 15 | Conservação, embalagem |
| Fabricante | 15 | 15 | Reputação e acabamento |
| Idade | 10 | 10 | Década e relevância |
| Escala | 10 | 10 | Raridade da escala |

Regras de piso: peça única ou numerada garante no mínimo "Super Raro" (70); linha básica de varejo (ex.: Hot Wheels mainline comum) fica limitada na raridade.

## Informar o que a foto não mostra
- No detalhe do item, nova opção "Informações especiais": marcar Edição especial, Numerada/limitada, Unidade única, Importado (país) e uma observação livre.
- Ao salvar, o score daquele item é recalculado considerando essas informações. Você poderá marcar o Cadillac como "Unidade única, importado dos EUA, edição Elvis Presley".

## Recalcular a coleção atual
- Recalcular todos os 133 itens com os novos critérios, usando os dados já salvos (marca, modelo, fabricante, série, observações), sem precisar escanear de novo.
- Preencher o detalhamento nos 21 itens que não têm.
- Valor de mercado é mantido.

## Score sempre mostra os critérios
- Tocar no score abre sempre a lista de critérios com a pontuação de cada um (ex.: "Raridade 32/35") e o motivo.
- Se um item antigo não tiver detalhamento, a tela mostra um botão "Calcular critérios" em vez de não abrir.
- Vale para perfil, scanner e upload de várias fotos.

## Detalhes técnicos
- `analyze-collectible`: novo bloco `priceIndex` com chaves rarity(35), exclusivity(15), condition(15), manufacturer(15), age(10), scale(10) e regras de piso; aceitar `userContext` (special_edition, numbered, unique, imported_from, notes).
- Nova edge function `recalculate-index`: recebe item_id(s), valida dono via JWT, chama o modelo em modo texto com os dados salvos + contexto do usuário, grava `price_index`, `rarity_tier`, `index_breakdown`. Execução em lote (paralelismo 4) para a coleção.
- Migração: coluna `user_context jsonb` em `items` (ou tabela equivalente onde ficam os itens do usuário), mantendo RLS/GRANT existentes.
- `src/lib/priceIndex.ts`: incluir `exclusivity` em `PriceIndexBreakdown`, rótulos e `getTierLabel`; `IndexBreakdown.tsx` usa a nova ordem e mantém compatibilidade com itens antigos.
- `CollectibleDetailCard.tsx`: remover a condição que só renderiza a folha quando existe breakdown; adicionar botão de recálculo e o formulário de informações especiais.
- Atualizar a memória da fórmula de raridade.
