

# Novo Fluxo de Autenticação - Cadastro Guiado

## Visao Geral

Remover login social (Google/Apple) e criar um fluxo de cadastro multi-etapas fluido para novos usuarios, com reconhecimento facial para usuarios existentes.

## Fluxo do Usuario

### Novo Usuario
1. Tela inicial pergunta o email
2. Sistema verifica se email ja existe no banco
3. Se nao existe, inicia cadastro em etapas:
   - **Etapa 1**: Nome completo
   - **Etapa 2**: Nome de usuario (como quer ser identificado)
   - **Etapa 3**: Telefone
   - **Etapa 4**: Senha (com confirmacao)
4. Apos criar conta, solicita aprovacao do Face ID / Touch ID
5. Solicita permissao da camera (para o scanner)
6. Redireciona para o Onboarding

### Usuario Existente
1. Tela inicial pergunta o email
2. Sistema verifica se email ja existe
3. Se existe, exibe o nome do usuario pre-preenchido
4. Tenta autenticar via Face ID / Touch ID
5. Se biometria falhar ou nao estiver disponivel, mostra campo de senha como fallback
6. Redireciona para o app

## Mudancas Tecnicas

### 1. `capacitor.config.ts`
- Reverter `backgroundColor` para `#00000000` (usar o historico de versoes)

### 2. `src/pages/Auth.tsx` (reescrita completa)
- Remover botoes de Google e Apple OAuth
- Remover imports do `lovable`, `Browser`, `CapApp`, e logica OAuth nativa
- Criar componente multi-etapas com estados:
  - `step`: "email" | "register-name" | "register-username" | "register-phone" | "register-password" | "login" | "permissions"
  - `formData`: objeto com nome, username, telefone, email, senha
- Na etapa "email": campo de email + botao "Continuar"
  - Ao submeter, chamar `supabase.auth.signInWithOtp` ou verificar existencia do usuario via tabela profiles
  - Se usuario existe -> ir para "login"
  - Se nao existe -> ir para "register-name"
- Etapas de registro: campos individuais com animacao de transicao suave (framer-motion)
- Etapa "login": mostrar avatar/nome do usuario + Face ID automatico + campo de senha como fallback
- Etapa "permissions": solicitar Face ID e Camera

### 3. Verificacao de usuario existente
- Consultar tabela `profiles` pelo email para determinar se e novo ou existente
- Nao depender de `signIn` para verificar existencia (evitar expor informacao de conta)

### 4. Fluxo de permissoes pos-cadastro
- Apos criar conta com sucesso:
  - Solicitar Face ID via `BiometricAuth.authenticate()` 
  - Solicitar permissao de camera via API nativa
  - Transicao suave para o Onboarding existente

### 5. Campos do banco de dados
- Verificar se a tabela `profiles` ja possui campo `phone` -- se nao, criar via migracao
- O campo `username` ja deve existir

### 6. `src/contexts/AuthContext.tsx`
- Atualizar `signUp` para incluir telefone nos metadados do usuario

## Detalhes de UI

- Cada etapa ocupa a tela inteira com animacao de slide (esquerda/direita)
- Botao "Voltar" em cada etapa (exceto email)
- Progresso visual (dots ou barra) mostrando em qual etapa esta
- Inputs grandes e claros com labels em portugues
- Validacao em tempo real (email valido, username minimo 3 chars, senha minimo 6 chars)
- Tela de login para usuario existente: avatar grande + nome + animacao de Face ID + link "Usar senha"

## Arquivos Afetados

| Arquivo | Acao |
|---------|------|
| `capacitor.config.ts` | Reverter backgroundColor (via historico) |
| `src/pages/Auth.tsx` | Reescrever completamente |
| `src/contexts/AuthContext.tsx` | Adicionar telefone ao signUp |
| `src/components/auth/BiometricPrompt.tsx` | Sem mudancas (reutilizar) |
| Migracao SQL | Adicionar coluna `phone` em profiles se necessario |

