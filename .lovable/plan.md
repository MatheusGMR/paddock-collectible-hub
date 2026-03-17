

# Plano: Escolha de Perfil (Loja vs Colecionador) no Onboarding

## Contexto
Atualmente, todo novo usuário passa pelo mesmo fluxo: registro multi-step → permissões → onboarding carousel → trial/assinatura → feed de colecionador. Não há distinção entre lojista e colecionador durante o cadastro.

## O que muda

### 1. Nova etapa no registro: "Tipo de Perfil"
Adicionar um novo step `register-profile-type` no fluxo de autenticação (`Auth.tsx`), inserido **após o telefone e antes da senha**. O usuário escolhe entre:
- **Colecionador** (ícone de carro/coleção) — fluxo atual, sem mudanças
- **Loja** (ícone de loja) — marca `is_seller = true` e pula o onboarding de assinatura

Será um novo componente `AuthStepProfileType.tsx` com dois cards selecionáveis.

### 2. Persistir a escolha no signup
O `formData` do `Auth.tsx` ganha um campo `profileType: "collector" | "seller"`. Ao registrar:
- O campo é passado como `user_metadata` no `signUp`
- O trigger `handle_new_user` já cria o perfil; vamos complementar para setar `is_seller = true` se o metadata indicar lojista
- Alternativamente, após o signup, fazemos um `UPDATE profiles SET is_seller = true` direto no client (mais simples, já que a RLS permite update do próprio perfil)

### 3. Fluxo pós-registro diferenciado
No `Auth.tsx`, após a etapa de permissões:
- **Colecionador**: `navigate("/")` → entra no `SubscriptionFlow` (onboarding carousel + trial) como hoje
- **Loja**: `navigate("/seller")` → vai direto ao painel de lojista, pulando o onboarding carousel e o gate de assinatura

### 4. Bypass do SubscriptionFlow para sellers
No `SubscriptionFlow` (dentro de `App.tsx`), além das rotas já bypassadas, verificar se o perfil do usuário é `is_seller`. Se for, não exibir onboarding carousel nem subscription gate — o seller usa a rota `/seller` que já está no bypass list.

### 5. Ativação automática do seller
Hoje, acessar `/seller` sem `is_seller = true` mostra um prompt "Tornar-se Lojista". Como o novo fluxo já marca o perfil como seller durante o registro, o usuário cairá direto no dashboard.

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/components/auth/AuthStepProfileType.tsx` | **Novo** — componente de seleção Loja/Colecionador |
| `src/pages/Auth.tsx` | Novo step `register-profile-type`, novo campo `profileType` no formData, lógica de redirecionamento pós-permissões |
| `src/components/auth/AuthProgressDots.tsx` | Ajustar `totalSteps` de 4 para 5 |
| `src/pages/Seller.tsx` | Chamar `activateSeller()` automaticamente se veio do onboarding (sem mostrar o card de ativação manual) |

## Detalhes técnicos

- Não é necessária migration de banco — o campo `is_seller` já existe na tabela `profiles`
- A função `activateSeller` no `useSellerData` já faz o update e cria `seller_details`
- O `SubscriptionFlow` já bypassa `/seller/*`, então sellers não ficam presos no gate de assinatura
- Para sellers que fazem login (não registro), o redirecionamento será feito checando `is_seller` no perfil após o login

