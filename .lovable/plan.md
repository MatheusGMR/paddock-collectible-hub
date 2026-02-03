

# Plano: Atualizar Price ID para Produção

## Objetivo
Substituir o price_id de teste pelo price_id de produção na Edge Function de assinatura.

---

## Alteração Necessária

### Arquivo: `supabase/functions/create-subscription/index.ts`

**Linha 15 - Atualização do Price ID:**

| Antes (Teste) | Depois (Produção) |
|---------------|-------------------|
| `price_1SuvHzP5JKEiOwRjVH443L2J` | `price_1SwrJfAmjEfh8Sz78f61BFur` |

---

## Detalhes da Configuração de Produção

```text
┌─────────────────────────────────────────┐
│         Stripe Live Mode                │
├─────────────────────────────────────────┤
│  Produto: Paddock Premium               │
│  Product ID: prod_Tugh2KsoW3RYZT        │
│  Price ID: price_1SwrJfAmjEfh8Sz78f61BFur │
│  Valor: R$ 19,90/mês                    │
│  Moeda: BRL                             │
│  Tipo: Recorrente (mensal)              │
└─────────────────────────────────────────┘
```

---

## Impacto

- ✅ Checkout embedded funcionará com pagamentos reais
- ✅ Assinaturas serão cobradas na conta Stripe de produção
- ✅ 7 dias de trial gratuito mantido
- ✅ Cupom de 50% para vencedores do desafio mantido

---

## Próximos Passos Após Implementação

1. Testar o fluxo de checkout completo
2. Verificar se o Customer Portal está configurado no Stripe Live
3. Confirmar que o webhook (se houver) está apontando para produção

