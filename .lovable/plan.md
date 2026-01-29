

# Plano: Implementar Pagamentos com Stripe, Apple Pay e Google Pay

## Visão Geral

Você terá um sistema de checkout completo onde:
- **Apple Pay** e **Google Pay** aparecem automaticamente em dispositivos compatíveis
- **Stripe** processa todos os pagamentos de forma segura
- Usuários podem comprar itens do Mercado ou fazer upgrade de funcionalidades

## Como Funciona

O Stripe Checkout é a forma mais rápida e segura de aceitar pagamentos. Quando habilitado:

| Dispositivo | O que o usuário vê |
|-------------|-------------------|
| iPhone/Safari | Botão Apple Pay aparece automaticamente |
| Android/Chrome | Botão Google Pay aparece automaticamente |
| Qualquer navegador | Formulário de cartão de crédito padrão |

Tudo isso com **uma única integração**! O Stripe detecta o dispositivo e mostra a melhor opção.

---

## O Que Será Criado

### 1. Produto de Teste no Stripe
Criar um produto de exemplo para testar o checkout:
- **Nome**: "Compra no Paddock"
- **Preço**: Configurável (ex: R$ 29,90)

### 2. Edge Function: `create-payment`
Uma função no backend que:
- Recebe o pedido do usuário
- Cria uma sessão de checkout no Stripe
- Retorna o link para pagamento

### 3. Página de Detalhes do Anúncio
Nova página que mostra:
- Foto e detalhes do item
- Preço formatado
- Botão "Comprar Agora" que leva ao checkout

### 4. Páginas de Resultado
- **Sucesso**: Confirmação de pagamento aprovado
- **Cancelado**: Opção de tentar novamente

---

## Fluxo do Usuário

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Fluxo de Compra                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Usuário navega no Mercado                                           │
│       ↓                                                                 │
│  2. Clica em um anúncio interno (Paddock)                               │
│       ↓                                                                 │
│  3. Vê página de detalhes com botão "Comprar"                           │
│       ↓                                                                 │
│  4. Clica em "Comprar Agora"                                            │
│       ↓                                                                 │
│  5. Redirecionado para Stripe Checkout                                  │
│     ┌─────────────────────────────────────────┐                         │
│     │  Apple Pay  │  Google Pay  │  Cartão    │                         │
│     └─────────────────────────────────────────┘                         │
│       ↓                                                                 │
│  6. Pagamento processado → Página de sucesso                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

| Tipo | Arquivo | Descrição |
|------|---------|-----------|
| **NOVO** | `supabase/functions/create-payment/index.ts` | Edge Function para criar sessão de checkout |
| **NOVO** | `src/pages/ListingDetails.tsx` | Página de detalhes do anúncio com botão de compra |
| **NOVO** | `src/pages/PaymentSuccess.tsx` | Página de confirmação de pagamento |
| **NOVO** | `src/pages/PaymentCanceled.tsx` | Página quando usuário cancela |
| **NOVO** | `src/components/checkout/BuyButton.tsx` | Componente de botão de compra |
| Modificar | `src/App.tsx` | Adicionar novas rotas |
| Modificar | `src/components/mercado/ListingCard.tsx` | Navegar para detalhes em anúncios internos |
| Modificar | `src/lib/i18n/translations/pt-BR.ts` | Textos de checkout |
| Modificar | `src/lib/i18n/translations/en.ts` | Textos de checkout |

---

## Detalhes Técnicos

### Edge Function `create-payment`

```typescript
// Recebe: listing_id, user_id (opcional)
// Retorna: { url: "https://checkout.stripe.com/..." }

// Características:
// - Busca dados do listing no banco
// - Cria sessão Stripe com preço do item
// - Suporta checkout como convidado (sem login)
// - Metadata inclui listing_id para rastreamento
```

### Componente BuyButton

```typescript
interface BuyButtonProps {
  listingId: string;
  price: number;
  currency: string;
  disabled?: boolean;
}

// Exibe:
// - Preço formatado
// - Ícone de cadeado (segurança)
// - Estados: normal, carregando, erro
```

### Página ListingDetails

```typescript
// URL: /listing/:id
// Exibe:
// - Imagem grande do item
// - Título e descrição
// - Informações do vendedor
// - Preço destacado
// - Botão de compra
// - Badge "Pagamento Seguro"
```

---

## Novas Traduções

### Português (pt-BR)
```typescript
checkout: {
  buyNow: "Comprar Agora",
  securePayment: "Pagamento Seguro",
  processing: "Processando...",
  paymentSuccess: "Pagamento Aprovado!",
  paymentSuccessDesc: "Seu pagamento foi processado com sucesso.",
  paymentCanceled: "Pagamento Cancelado",
  paymentCanceledDesc: "Você cancelou o pagamento. Deseja tentar novamente?",
  tryAgain: "Tentar Novamente",
  backToMarket: "Voltar ao Mercado",
  contactSeller: "Entrar em Contato",
  orderConfirmed: "Pedido Confirmado",
  viewOrder: "Ver Pedido",
}
```

### Inglês (en)
```typescript
checkout: {
  buyNow: "Buy Now",
  securePayment: "Secure Payment",
  processing: "Processing...",
  paymentSuccess: "Payment Approved!",
  paymentSuccessDesc: "Your payment was processed successfully.",
  paymentCanceled: "Payment Canceled",
  paymentCanceledDesc: "You canceled the payment. Would you like to try again?",
  tryAgain: "Try Again",
  backToMarket: "Back to Market",
  contactSeller: "Contact Seller",
  orderConfirmed: "Order Confirmed",
  viewOrder: "View Order",
}
```

---

## Sobre Apple Pay e Google Pay

**Não há código extra necessário!** O Stripe Checkout:
1. Detecta automaticamente se o dispositivo suporta Apple Pay/Google Pay
2. Exibe os botões apropriados sem configuração adicional
3. Processa pagamentos de wallet como qualquer outro pagamento

Para produção, você precisará:
- **Apple Pay**: Registrar domínio no Stripe Dashboard
- **Google Pay**: Funciona automaticamente

---

## Próximos Passos Após Implementação

1. **Registrar domínio para Apple Pay**
   - No Stripe Dashboard → Settings → Payment Methods → Apple Pay
   - Adicionar o domínio de produção

2. **Testar em dispositivos reais**
   - iPhone com Apple Pay configurado
   - Android com Google Pay configurado

3. **Tabela de pedidos (opcional)**
   - Criar tabela `orders` para rastrear compras
   - Implementar webhook para confirmar pagamentos

---

## Resumo

| Passo | O Que Fazer |
|-------|-------------|
| 1 | Criar produto/preço no Stripe |
| 2 | Criar Edge Function `create-payment` |
| 3 | Criar página de detalhes do anúncio |
| 4 | Criar páginas de sucesso/cancelado |
| 5 | Adicionar rotas no App.tsx |
| 6 | Modificar ListingCard para navegação |
| 7 | Adicionar traduções |
| 8 | Testar fluxo completo |

Com isso, seus usuários terão checkout rápido com Apple Pay, Google Pay e cartão - tudo em uma integração unificada!

