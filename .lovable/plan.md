

# Perfil do Vendedor Clicavel no Anuncio

## Objetivo
Tornar o card do vendedor na pagina de detalhes do anuncio (`ListingDetails`) mais rico e interativo, permitindo que o comprador veja informacoes relevantes do vendedor e navegue ate o perfil completo.

## O que muda

### 1. Enriquecer o card do vendedor (ListingDetails.tsx)

O card do vendedor atual mostra apenas avatar, username e cidade. Sera expandido para incluir:

- **Quantidade de itens na colecao** do vendedor (busca da tabela `user_collection`)
- **Quantidade de seguidores** (busca da tabela `follows`)
- **Indice medio de raridade** da colecao (calculado a partir dos itens)
- **Botao "Ver Perfil"** que navega para `/user/:userId`
- **Card inteiro clicavel** como alternativa ao botao

### 2. Buscar dados adicionais do vendedor

No `useEffect` de `ListingDetails.tsx`, alem de buscar `username, avatar_url, city`, tambem buscar:
- Contagem de itens na colecao (`getCollectionCount`)
- Contagem de seguidores (`getFollowCounts`)
- Indice medio de raridade (media dos `price_index` dos itens na colecao)

Essas funcoes ja existem em `src/lib/database.ts` (`getFollowCounts`, `getCollectionCount`).

### 3. Navegacao para o perfil

Ao clicar no card do vendedor ou no botao "Ver Perfil", navegar para `/user/:userId` que ja existe e mostra o perfil completo com colecao, posts e opcao de seguir/enviar mensagem.

---

## Detalhes Tecnicos

### Arquivo: `src/pages/ListingDetails.tsx`

**Dados adicionais no state:**
```typescript
const [sellerStats, setSellerStats] = useState<{
  collection: number;
  followers: number;
  averageIndex: number | null;
} | null>(null);
```

**Busca no useEffect** (apos buscar o profile do vendedor):
- Chamar `getCollectionCount(data.user_id)` e `getFollowCounts(data.user_id)`
- Query para media do price_index dos itens da colecao do vendedor

**Card do vendedor redesenhado:**
- Card clicavel com `onClick={() => navigate(`/user/${listing.user_id}`)}`
- Layout: avatar + username/cidade na esquerda, stats (itens, seguidores, indice) na direita
- Seta indicando navegacao (ChevronRight)
- Badge visual se o vendedor tiver indice alto ou muitos itens

### Imports adicionais
- `getFollowCounts`, `getCollectionCount` de `@/lib/database`
- `ChevronRight` de `lucide-react`

### Nenhuma alteracao de banco de dados necessaria
Todas as tabelas e policies ja existem e permitem leitura publica dos dados necessarios.

