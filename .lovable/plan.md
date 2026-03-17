

# Carrinho de Compras no Mercado

## Resumo
Implementar um sistema de carrinho de compras dentro do Mercado, permitindo que o usuario adicione multiplos anuncios ao carrinho e finalize a compra com um pagamento unico consolidado via Stripe.

## Fase 1: Carrinho (esta etapa)

### 1. Tabela `cart_items` no banco de dados

Nova tabela para persistir o carrinho do usuario entre sessoes:

```text
cart_items
-----------
id          UUID (PK)
user_id     TEXT (NOT NULL)
listing_id  UUID (FK -> listings.id, NOT NULL)
quantity    INT (default 1)
created_at  TIMESTAMPTZ (default now())

UNIQUE(user_id, listing_id)
RLS: usuarios so veem/editam seus proprios itens
```

### 2. Icone do carrinho no header do Mercado

- Adicionar icone `ShoppingCart` no canto superior direito do header de `Mercado.tsx`
- Badge com contador de itens no carrinho (numero vermelho)
- Ao clicar, abre um Sheet (drawer) lateral com os itens do carrinho

### 3. Botao "Adicionar ao Carrinho" nos listings

- No `MarketplaceCard` e no `ListingDetails`, adicionar botao "Adicionar ao Carrinho" ao lado do botao de compra direta
- Feedback visual (toast) ao adicionar
- Prevenir duplicatas (UNIQUE constraint)

### 4. Sheet do Carrinho (`CartSheet.tsx`)

Novo componente drawer que mostra:
- Lista de itens no carrinho com imagem, titulo, preco
- Botao de remover item individual
- Subtotal calculado
- Botao "Finalizar Compra" que inicia o checkout consolidado

### 5. Checkout Consolidado (Edge Function)

Atualizar `create-payment` (ou criar `create-cart-payment`) para aceitar multiplos listing_ids:
- Recebe array de listing_ids do carrinho
- Cria uma unica sessao Stripe Checkout com multiplos `line_items`
- Cada item vira um line_item separado na fatura
- Apos sucesso, limpa o carrinho do usuario

### 6. Pos-compra

- Pagina de sucesso ja existente sera reaproveitada
- Limpar os itens do carrinho apos pagamento confirmado
- Atualizar status dos listings para "sold"

---

## Detalhes Tecnicos

### Migracao SQL
```text
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Usuarios so acessam seu proprio carrinho
CREATE POLICY "Users manage own cart"
  ON cart_items FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
```

### Arquivos novos
- `src/components/mercado/CartSheet.tsx` - Drawer do carrinho com lista de itens
- `src/components/mercado/AddToCartButton.tsx` - Botao reutilizavel de adicionar ao carrinho
- `src/hooks/useCart.ts` - Hook para gerenciar estado do carrinho (add, remove, count, total)
- `supabase/functions/create-cart-payment/index.ts` - Edge function para checkout consolidado

### Arquivos modificados
- `src/pages/Mercado.tsx` - Adicionar icone do carrinho no header
- `src/pages/ListingDetails.tsx` - Adicionar botao "Adicionar ao Carrinho" ao lado do "Comprar Agora"
- `src/components/checkout/BuyButton.tsx` - Manter como opcao de compra direta

### Hook `useCart`
```text
useCart() retorna:
- items: CartItem[] (com dados do listing join)
- count: number
- total: number
- isLoading: boolean
- addItem(listingId)
- removeItem(listingId)
- clearCart()
- checkout() -> abre Stripe
```

### Edge Function `create-cart-payment`
- Recebe: { listing_ids: string[] }
- Busca todos os listings no banco
- Cria sessao Stripe com multiplos line_items (um por listing)
- Retorna URL do checkout
- Metadata inclui todos os listing_ids para rastreamento

---

## Fase 2 (proxima etapa - nao implementada agora)
- Perfil de loja com dashboard web
- Upload de estoque via Excel/CSV/imagem
- Painel financeiro com vendas e recebiveis
- Stripe Connect para distribuicao automatica aos vendedores

