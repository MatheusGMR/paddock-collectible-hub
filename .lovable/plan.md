
# Plano: Aumento Gradual para 7 Carros + Monitoramento de Erros no Admin

## Resumo

Este plano implementa duas funcionalidades:
1. **Aumento gradual do limite de 5 para 7 carrinhos por foto** com reforço de prompt para manter precisão
2. **Nova seção "Performance & Erros" no Admin** para monitorar taxa de sucesso, erros e feedback do scanner

---

## Parte 1: Aumento do Limite para 7 Carrinhos

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/analyze-collectible/index.ts` | Atualizar prompt: "max 7" + instruções anti-padronização |
| `src/components/scanner/ScannerView.tsx` | Validação `count <= 7` |
| `src/lib/i18n/translations/pt-BR.ts` | Mensagens: "máximo é 7" |
| `src/lib/i18n/translations/en.ts` | Mensagens: "limit is 7" |

### Alterações no Prompt da IA

Adicionar instruções específicas para evitar padronização de fabricante:

```
ANÁLISE INDIVIDUAL OBRIGATÓRIA (CRÍTICO):
- Trate CADA carro como análise COMPLETAMENTE INDEPENDENTE
- NUNCA assuma que todos os carros são do mesmo fabricante
- Examine a BASE de CADA carro individualmente para identificar o fabricante
- Diferentes fabricantes podem estar na mesma foto (Hot Wheels + Matchbox + Greenlight)
- Se não conseguir ver a base de um carro específico, analise proporções e estilo individualmente
```

Atualizar linha do STEP 3:
```
For each collectible (max 7), provide full analysis...
```

Atualizar validação de "too_many_cars":
```
ONLY set "too_many_cars" if you can clearly see MORE THAN 7 SEPARATE PHYSICAL CAR OBJECTS
```

---

## Parte 2: Seção de Performance & Erros no Admin

### Nova Estrutura de Dados

Criar função RPC `get_admin_scanner_performance` que retorna:

```typescript
interface ScannerPerformanceStats {
  total_scans: number;
  successful_scans: number;
  failed_scans: number;
  success_rate: number;
  
  // Erros por tipo
  errors_by_type: Array<{
    error_type: string;
    count: number;
    percentage: number;
  }>;
  
  // Erros recentes (últimos 50)
  recent_errors: Array<{
    id: string;
    created_at: string;
    user_id: string;
    username: string;
    error_type: string;
    error_message: string;
    function_name: string;
  }>;
  
  // Tendência diária
  daily_stats: Array<{
    date: string;
    total: number;
    success: number;
    failed: number;
  }>;
  
  // Feedback de precisão (scan_feedback)
  accuracy_feedback: {
    total: number;
    positive: number;
    negative: number;
    by_field: Array<{
      field: string;
      reports: number;
    }>;
  };
}
```

### Tabela de Logs de Erro (Migração)

```sql
CREATE TABLE IF NOT EXISTS public.scanner_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  function_name TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para consultas rápidas
CREATE INDEX idx_scanner_errors_created_at ON scanner_error_logs(created_at DESC);
CREATE INDEX idx_scanner_errors_type ON scanner_error_logs(error_type);

-- RLS
ALTER TABLE scanner_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all error logs"
  ON scanner_error_logs FOR SELECT
  USING (public.is_admin());
```

### Modificar Edge Function para Logar Erros

Adicionar try-catch com log de erros na `analyze-collectible`:

```typescript
// Em caso de erro na análise
async function logScanError(
  supabase: any,
  userId: string | null,
  errorType: string,
  errorMessage: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    await supabase.from("scanner_error_logs").insert({
      user_id: userId,
      function_name: "analyze-collectible",
      error_type: errorType,
      error_message: errorMessage,
      metadata,
    });
  } catch (err) {
    console.error("[Error Log] Failed:", err);
  }
}
```

Tipos de erro a capturar:
- `ai_timeout` - Timeout da IA
- `ai_rate_limit` - Rate limit atingido
- `image_quality` - Problemas de qualidade de imagem
- `identification_failed` - Não conseguiu identificar
- `too_many_cars` - Muitos carros
- `parse_error` - Erro ao parsear resposta da IA
- `unknown` - Erros não categorizados

### Novo Componente: AdminPerformanceSection.tsx

Exibirá:
1. **Cards de Resumo**
   - Taxa de Sucesso (%)
   - Total de Scans
   - Erros no período
   - Feedback negativo

2. **Gráfico de Tendência**
   - Linha de sucesso vs falha por dia

3. **Erros por Tipo (Pie Chart)**
   - Visualização rápida dos tipos de erro mais comuns

4. **Tabela de Erros Recentes**
   - Data, Usuário, Tipo, Mensagem
   - Filtro por tipo de erro

5. **Feedback de Precisão (do scan_feedback existente)**
   - Campos mais reportados como incorretos
   - Total de likes vs reports

### Integração no Admin.tsx

Adicionar nova aba "Performance" entre "IA" e "Push":

```tsx
<TabsList className="grid w-full grid-cols-6">
  <TabsTrigger value="overview">Geral</TabsTrigger>
  <TabsTrigger value="analytics">Analytics</TabsTrigger>
  <TabsTrigger value="ai">IA</TabsTrigger>
  <TabsTrigger value="performance">Performance</TabsTrigger>  {/* NOVO */}
  <TabsTrigger value="push">Push</TabsTrigger>
  <TabsTrigger value="users">Usuários</TabsTrigger>
</TabsList>
```

---

## Arquivos Criados/Modificados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/analyze-collectible/index.ts` | Modificar - Limite 7 + instruções + log de erros |
| `src/components/scanner/ScannerView.tsx` | Modificar - Validação `<= 7` |
| `src/lib/i18n/translations/pt-BR.ts` | Modificar - Mensagens "máximo 7" |
| `src/lib/i18n/translations/en.ts` | Modificar - Mensagens "limit 7" |
| `src/components/admin/AdminPerformanceSection.tsx` | **Criar** - Nova seção de performance |
| `src/hooks/useAdmin.ts` | Modificar - Adicionar hook `useAdminScannerPerformance` |
| `src/pages/Admin.tsx` | Modificar - Adicionar aba Performance |
| Migração SQL | **Criar** - Tabela `scanner_error_logs` + RPC `get_admin_scanner_performance` |

---

## Benefícios

1. **Aumento para 7 carros** permite fotografar grupos maiores sem falsos "too_many_cars"
2. **Instruções anti-padronização** reduzem risco de identificação incorreta de fabricante
3. **Monitoramento centralizado** permite identificar problemas rapidamente
4. **Análise de feedback** ajuda a entender onde a IA erra mais
5. **Tendências diárias** permitem detectar degradação de performance

---

## Detalhes Técnicos

### SQL da Função RPC

```sql
CREATE OR REPLACE FUNCTION get_admin_scanner_performance(days_back INTEGER DEFAULT 7)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  start_date TIMESTAMP;
BEGIN
  -- Verificar se é admin
  IF NOT is_admin() THEN
    RETURN NULL;
  END IF;
  
  start_date := now() - (days_back || ' days')::interval;
  
  -- Construir resultado agregado
  SELECT jsonb_build_object(
    'total_scans', (SELECT COUNT(*) FROM ai_usage_logs 
                    WHERE function_name = 'analyze-collectible' 
                    AND created_at >= start_date),
    'successful_scans', (SELECT COUNT(*) FROM ai_usage_logs 
                         WHERE function_name = 'analyze-collectible' 
                         AND created_at >= start_date
                         AND (metadata->>'identified')::boolean = true),
    -- ... demais campos
  ) INTO result;
  
  RETURN result;
END;
$$;
```

### Visualização no Admin

A seção de Performance mostrará:
- Card verde: Taxa de sucesso (ex: "92.3%")
- Card vermelho: Erros totais (ex: "47")
- Card amarelo: Reports de precisão (ex: "12")
- Gráfico de linha: Tendência de sucesso/falha
- Tabela: Últimos erros com detalhes
