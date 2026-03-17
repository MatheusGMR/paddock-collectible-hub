

## Plano: Pipeline de Status de Pedidos, Etiqueta de Envio e Gestão de Inventário Automática

### Contexto Atual

- Vendas são registradas na tabela `sales` com `status: "pending"` no momento do checkout
- O listing **não** é marcado como "sold" após pagamento confirmado — não existe lógica de atualização automática
- Não existe página de detalhes de pedido para o vendedor
- A `get-purchase-items` verifica `payment_status === "paid"` no Stripe mas não atualiza o banco
- Tabela `sales` não possui coluna para tracking de envio
- Listagem tem RLS que só mostra `status = 'active'`

---

### 1. Schema: Adicionar coluna de status de envio + atualizar sales

**Migração SQL:**
- Adicionar `shipping_status` à tabela `sales` (enum: `confirmed`, `preparing`, `in_transit`, `delivered`) com default `confirmed`
- Adicionar `shipping_photo_url` (text, nullable) para foto do produto embalado
- Adicionar `tracking_code` (text, nullable)
- Adicionar policy UPDATE para sellers na tabela `sales`: `seller_id = auth.uid()::text`
- Adicionar policy UPDATE para sellers na tabela `listings` (já existe)

### 2. Edge Function: `confirm-payment` (webhook-like verificação)

Criar uma edge function que, ao ser chamada com `session_id`:
1. Verifica o status do pagamento no Stripe (`session.payment_status === "paid"`)
2. Atualiza `sales.status` de `pending` para `completed`
3. Atualiza `sales.shipping_status` para `confirmed`
4. Marca o `listing.status` como `sold` (gestão de inventário automática)
5. Retorna os dados do pedido

Esta function será chamada em dois momentos:
- Na página `PaymentSuccess` (confirma imediatamente)
- Na página de detalhes do pedido do seller (para refresh)

### 3. Nova Página: Detalhes do Pedido (`/seller/order/:saleId`)

**Pipeline Visual (Timeline):**
- Barra horizontal com 4 etapas: Venda Confirmada → Preparando Envio → Em Trânsito → Entregue
- Ícones e cores mudam conforme `shipping_status`
- Cada step com check verde se concluído, amarelo se atual, cinza se futuro

**Card do Pedido:**
- Foto do item, título, preço, dados do comprador
- Badge de status com cor dinâmica

**Botão "Gerar Etiqueta de Envio":**
- Visível quando status = `confirmed`
- Fluxo: Botão "Abrir Câmera" → captura foto do produto embalado → upload para storage → habilita "Gerar Etiqueta"
- Etiqueta: componente formatado para impressão com dados do destinatário, lista de itens, QR Code (usando qrcode.react já instalado)
- Botão para imprimir/baixar via `window.print()`

**Botões de Avanço de Status:**
- Seller pode avançar status: Confirmar Envio → Marcar em Trânsito → Marcar Entregue

### 4. Atualizar `SellerInventory` e Fluxo do Vendedor

- Na aba "Vendidos", cada item clicável navega para `/seller/order/:saleId`
- Listings vendidos mostram badge "Vendido" (já existe)

### 5. Vitrine: Desabilitar compra quando `status !== 'active'`

- `ListingDetails`: verificar `listing.status` — se `sold`, mostrar badge "Vendido" e desabilitar BuyButton e AddToCartButton
- A RLS já filtra por `status = 'active'`, mas a query em ListingDetails busca por ID sem filtro de status — adicionar tratamento visual

### 6. PaymentSuccess: Chamar `confirm-payment`

- Após carregar, invocar `confirm-payment` com `session_id` para confirmar venda e marcar listing como sold
- Isso garante que o inventário é decrementado no momento certo (quando Stripe confirma)

### 7. Rota e Navegação

- Adicionar rota `/seller/order/:saleId` no `Seller.tsx` (dentro do Routes existente)
- Garantir que rotas de skip de assinatura não quebrem — `/seller/order` requer auth mas não requer subscription

---

### Arquivos a Criar/Editar

| Arquivo | Ação |
|---|---|
| Migração SQL | Criar (add shipping_status, shipping_photo_url, tracking_code, RLS update) |
| `supabase/functions/confirm-payment/index.ts` | Criar |
| `src/components/seller/OrderDetails.tsx` | Criar (timeline + etiqueta + câmera) |
| `src/components/seller/ShippingLabel.tsx` | Criar (componente de etiqueta impressível) |
| `src/pages/Seller.tsx` | Editar (adicionar rota order/:saleId) |
| `src/pages/ListingDetails.tsx` | Editar (desabilitar compra se sold) |
| `src/pages/PaymentSuccess.tsx` | Editar (chamar confirm-payment) |
| `src/components/seller/SellerInventory.tsx` | Editar (link para order details) |
| `supabase/config.toml` | Editar (registrar confirm-payment) |

### Fluxo Resumido

```text
Comprador paga (Stripe) 
  → PaymentSuccess chama confirm-payment
    → sales.status = completed, shipping_status = confirmed
    → listing.status = sold (remove da vitrine)
  
Vendedor abre /seller/order/:id
  → Vê timeline: [✓ Confirmada] → [Preparando] → [Trânsito] → [Entregue]
  → Tira foto do embalado → Gera etiqueta com QR
  → Avança status manualmente
  
Vitrine: listing sold → botão desabilitado, badge "Vendido"
```

