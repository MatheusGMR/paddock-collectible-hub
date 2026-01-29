

# Plano: Onboarding com Trial de 7 Dias e Assinatura

## Visão Geral

Implementar um fluxo de onboarding para novos usuários que:
1. Exibe um carrossel com 3-5 slides explicando os diferenciais do app
2. Último slide apresenta a oferta: **7 dias grátis**, depois **R$ 19,90/mês** (não R$ 49,90)
3. Usuário pode assinar ou pular
4. Se pular, após 7 dias o checkout se torna obrigatório

---

## Fluxo do Usuário

```text
                          Novo Usuário
                               |
                               v
                    +------------------+
                    |   Splash Screen  |
                    +------------------+
                               |
                               v
                    +------------------+
                    |  Tela de Login   |
                    +------------------+
                               |
                               v
                    +-----------------------+
                    | Primeira vez logando? |
                    +-----------------------+
                          |           |
                         Sim         Não
                          |           |
                          v           |
              +---------------------+ |
              | Onboarding Carousel | |
              | (3-5 slides + GIFs) | |
              +---------------------+ |
                          |           |
                          v           |
              +---------------------+ |
              |  Slide Final:       | |
              |  7 dias grátis      | |
              |  Depois R$ 19,90    | |
              +---------------------+ |
                    |           |     |
              Assinar         Pular   |
                    |           |     |
                    v           v     |
              +---------+  +------+   |
              | Stripe  |  | Marca|   |
              |Checkout |  |trial |   |
              +---------+  |start |   |
                    |      +------+   |
                    |           |     |
                    +-----------+-----+
                               |
                               v
                    +------------------+
                    |   App Principal  |
                    +------------------+
                               |
                    (7 dias depois, se pulou)
                               |
                               v
                    +---------------------+
                    | Trial expirou!      |
                    | Checkout obrigatório|
                    +---------------------+
```

---

## O Que Será Criado

### 1. Produto de Assinatura no Stripe
| Item | Valor |
|------|-------|
| **Nome** | Paddock Premium |
| **Preço** | R$ 19,90/mês |
| **Trial** | 7 dias |
| **Intervalo** | Mensal |

### 2. Tabela no Banco: `user_subscriptions`
Rastrear status de assinatura e trial:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | ID único |
| `user_id` | text | ID do usuário |
| `status` | text | 'trial', 'active', 'expired', 'canceled' |
| `trial_started_at` | timestamp | Quando começou o trial |
| `trial_ends_at` | timestamp | Quando o trial expira |
| `subscription_id` | text | ID da assinatura no Stripe (se houver) |
| `created_at` | timestamp | Data de criação |
| `updated_at` | timestamp | Data de atualização |

### 3. Edge Functions

| Função | Propósito |
|--------|-----------|
| `check-subscription` | Verificar status da assinatura/trial do usuário |
| `create-subscription` | Criar sessão de checkout para assinatura com trial |
| `start-trial` | Iniciar período de trial quando usuário pula onboarding |

### 4. Componentes de Onboarding

| Componente | Descrição |
|------------|-----------|
| `OnboardingCarousel.tsx` | Carrossel fullscreen com GIFs e texto |
| `OnboardingSlide.tsx` | Slide individual com animação |
| `PricingSlide.tsx` | Slide final com oferta e CTA |
| `SubscriptionGate.tsx` | Bloqueio quando trial expira |

---

## Conteúdo dos Slides do Onboarding

### Slide 1: Scanner Inteligente
- **GIF**: Mostrando o scan de um carrinho
- **Título**: "Identifique Instantaneamente"
- **Texto**: "Escaneie qualquer carrinho e descubra marca, modelo, ano e até o valor de mercado"

### Slide 2: Sua Coleção Digital
- **GIF**: Navegando pela coleção
- **Título**: "Organize Sua Coleção"
- **Texto**: "Mantenha seu acervo catalogado com fotos, detalhes e histórico de aquisição"

### Slide 3: Índice de Preços
- **GIF**: Mostrando o índice subindo
- **Título**: "Saiba o Valor Real"
- **Texto**: "Acompanhe a valorização dos seus itens com nosso índice exclusivo"

### Slide 4: Mercado Integrado
- **GIF**: Navegando no mercado
- **Título**: "Compre e Venda"
- **Texto**: "Encontre peças raras em marketplaces do mundo todo em um só lugar"

### Slide 5 (Final): Oferta Premium
- **Visual**: Badge de desconto, preço riscado
- **Título**: "Comece Grátis!"
- **Conteúdo**:
  - "7 dias grátis para experimentar tudo"
  - ~~R$ 49,90/mês~~ → **R$ 19,90/mês**
  - "60% de desconto por tempo limitado"
- **Botões**: 
  - "Começar Trial Grátis" (primário)
  - "Pular por enquanto" (secundário)

---

## Arquivos a Criar

| Arquivo | Propósito |
|---------|-----------|
| `src/components/onboarding/OnboardingCarousel.tsx` | Componente principal do carrossel |
| `src/components/onboarding/OnboardingSlide.tsx` | Slide genérico com GIF e texto |
| `src/components/onboarding/PricingSlide.tsx` | Slide final com oferta |
| `src/components/onboarding/SubscriptionGate.tsx` | Tela de bloqueio pós-trial |
| `src/contexts/SubscriptionContext.tsx` | Estado global de assinatura |
| `supabase/functions/check-subscription/index.ts` | Verificar status |
| `supabase/functions/create-subscription/index.ts` | Criar checkout de assinatura |
| `supabase/functions/start-trial/index.ts` | Iniciar trial gratuito |

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/App.tsx` | Integrar onboarding no fluxo, adicionar SubscriptionContext |
| `src/contexts/AuthContext.tsx` | Verificar se é primeiro login |
| `src/lib/i18n/translations/pt-BR.ts` | Textos do onboarding |
| `src/lib/i18n/translations/en.ts` | Textos do onboarding em inglês |

---

## Novas Traduções

### Português (pt-BR)
```typescript
onboarding: {
  skip: "Pular",
  next: "Próximo",
  getStarted: "Começar",
  
  // Slides
  slide1Title: "Identifique Instantaneamente",
  slide1Text: "Escaneie qualquer carrinho e descubra marca, modelo, ano e até o valor de mercado",
  
  slide2Title: "Organize Sua Coleção",
  slide2Text: "Mantenha seu acervo catalogado com fotos, detalhes e histórico de aquisição",
  
  slide3Title: "Saiba o Valor Real",
  slide3Text: "Acompanhe a valorização dos seus itens com nosso índice exclusivo",
  
  slide4Title: "Compre e Venda",
  slide4Text: "Encontre peças raras em marketplaces do mundo todo em um só lugar",
  
  // Pricing slide
  pricingTitle: "Comece Grátis!",
  freeTrial: "7 dias grátis para experimentar tudo",
  originalPrice: "R$ 49,90/mês",
  discountedPrice: "R$ 19,90/mês",
  discountBadge: "60% OFF",
  limitedTime: "Oferta por tempo limitado",
  startTrial: "Começar Trial Grátis",
  skipForNow: "Pular por enquanto",
  
  // Subscription gate
  trialExpired: "Seu período de teste acabou",
  trialExpiredDesc: "Você aproveitou 7 dias grátis. Para continuar usando o Paddock, assine agora.",
  subscribeNow: "Assinar Agora",
  restoreSubscription: "Já sou assinante",
},

subscription: {
  active: "Assinatura Ativa",
  trial: "Período de Teste",
  expired: "Expirado",
  daysLeft: "dias restantes",
  subscribedUntil: "Assinatura até",
  managePlan: "Gerenciar Plano",
},
```

---

## Lógica de Verificação de Assinatura

### No App (a cada entrada)
```typescript
// Pseudocódigo
1. Usuário faz login
2. Chamar check-subscription
3. Se status === 'active' → acesso completo
4. Se status === 'trial':
   - Se trial_ends_at > agora → acesso completo
   - Se trial_ends_at < agora → mostrar SubscriptionGate
5. Se status === 'expired' → mostrar SubscriptionGate
6. Se não tem registro → mostrar OnboardingCarousel
```

### Edge Function: check-subscription
```typescript
// Verifica no Stripe se tem assinatura ativa
// Verifica na tabela user_subscriptions o status do trial
// Retorna: { status, trial_ends_at, subscription_end }
```

---

## Sobre os GIFs

Para os GIFs do onboarding, você pode:

1. **Usar animações Lottie** (recomendado) - mais leves e escaláveis
2. **GIFs estáticos** - adicionar em `public/onboarding/`
3. **Vídeos curtos** - usar tag `<video>` com autoplay/loop

Por enquanto, implementarei com **placeholders animados** que podem ser substituídos por GIFs reais posteriormente.

---

## Fluxo Técnico Detalhado

### 1. Primeiro Acesso (Novo Usuário)
```text
Login → check-subscription → sem registro
       ↓
  Mostrar OnboardingCarousel
       ↓
  Usuário chega no slide final
       ↓
  [Começar Trial] → create-subscription → Stripe Checkout
       ou
  [Pular] → start-trial → Cria registro com trial_ends_at = now + 7 dias
       ↓
  Redireciona para o App
```

### 2. Acesso com Trial Ativo
```text
Login → check-subscription → trial válido
       ↓
  Acesso normal ao App
  (Opcional: mostrar banner "X dias restantes")
```

### 3. Trial Expirado
```text
Login → check-subscription → trial expirado
       ↓
  Mostrar SubscriptionGate (tela cheia, sem escape)
       ↓
  [Assinar Agora] → create-subscription → Stripe Checkout
       ↓
  Após pagamento → check-subscription → status = active
       ↓
  Acesso ao App
```

---

## Resumo da Implementação

| Passo | Descrição |
|-------|-----------|
| 1 | Criar produto de assinatura no Stripe (R$ 19,90/mês) |
| 2 | Criar tabela `user_subscriptions` |
| 3 | Criar Edge Functions para gerenciar assinatura |
| 4 | Criar componentes de onboarding (carrossel + slides) |
| 5 | Criar SubscriptionContext para estado global |
| 6 | Criar SubscriptionGate para bloqueio pós-trial |
| 7 | Integrar no App.tsx com lógica de verificação |
| 8 | Adicionar traduções |
| 9 | Testar fluxo completo: trial → expiração → assinatura |

---

## Benefícios

- **Conversão**: Usuário experimenta antes de pagar
- **Retenção**: 7 dias para criar hábito de uso
- **Simplicidade**: Fluxo único para todos os cenários
- **Preço atrativo**: Desconto cria senso de urgência (R$ 49,90 → R$ 19,90)

