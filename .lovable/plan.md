

# Plano: Corrigir Erro de Recursão Infinita nas Políticas RLS

## Problema Identificado

O aplicativo está quebrando com erro **"failed to fetch"** porque a política de segurança (RLS) da tabela `conversation_participants` está causando **recursão infinita**.

A política atual faz:
```sql
-- PROBLEMÁTICO: Consulta a própria tabela para verificar acesso
EXISTS (SELECT 1 FROM conversation_participants cp 
        WHERE cp.conversation_id = conversation_participants.conversation_id 
        AND cp.user_id = auth.uid())
```

Isso cria um loop sem fim: para ler a tabela, precisa consultar a mesma tabela, que precisa aplicar a mesma política, que consulta novamente...

## Solução

Reescrever a política RLS para usar uma verificação direta que não cause recursão:

```text
Antes (recursivo):
  "Posso ver se existe um participante com meu ID nesta conversa"
  
Depois (direto):
  "Posso ver apenas os registros onde o user_id sou eu mesmo"
```

---

## Etapas Técnicas

### 1. Remover política RLS problemática

Deletar a política `Users can view participants of their conversations` da tabela `conversation_participants`.

### 2. Criar nova política sem recursão

Criar uma política simples que permite ao usuário ver:
- Registros onde ele próprio é o participante (`user_id = auth.uid()`)
- OU registros de conversas das quais ele participa (via consulta à tabela `conversations` ao invés de `conversation_participants`)

A nova política será:
```sql
CREATE POLICY "Users can view their own participant records and co-participants"
ON public.conversation_participants
FOR SELECT
USING (
  user_id = auth.uid() 
  OR 
  conversation_id IN (
    SELECT conversation_id 
    FROM public.conversation_participants 
    WHERE user_id = auth.uid()
  )
);
```

**Observação**: Esta abordagem ainda referencia a própria tabela, mas de forma segura porque a primeira condição (`user_id = auth.uid()`) é avaliada primeiro e satisfaz a política para os registros do próprio usuário, permitindo que a subconsulta funcione.

Alternativa mais robusta (sem auto-referência):
```sql
CREATE POLICY "Users can view participant records"
ON public.conversation_participants
FOR SELECT
USING (user_id = auth.uid());
```

Esta política mais simples permite que o usuário veja apenas seus próprios registros de participação. Para ver os outros participantes de uma conversa, o código frontend já faz uma segunda query filtrando por `conversation_id` e `neq user_id`.

### 3. Testar o fluxo de mensagens

Após aplicar a correção, verificar:
- Login funciona normalmente
- Tela principal carrega
- Ícone de chat funciona
- Lista de conversas carrega
- Mensagens podem ser enviadas e recebidas

---

## Resultado Esperado

Após a migração:
- O erro de recursão infinita será eliminado
- O app voltará a funcionar normalmente
- O sistema de mensagens continuará funcionando como esperado

