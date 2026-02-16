

# Otimizacao do Scanner: Meta 3-6 Segundos

## Diagnostico dos Gargalos Atuais

A analise atual leva ~8-15 segundos devido a uma combinacao de fatores:

| Gargalo | Impacto Estimado | Onde |
|---------|-----------------|------|
| Modelo `gpt-4o` com `detail: "high"` | +4-8s (tiling da imagem em multiplos blocos 512px) | Edge Function |
| Prompt extenso (~4000 tokens de entrada) | +1-2s (processamento do sistema) | Edge Function |
| Imagem 1280px / qualidade 0.85 | +0.5-1s (upload base64 grande) | Frontend |
| `max_tokens: 4096` para saida | +1-3s (geracao lenta de texto longo) | Edge Function |
| `logUsage` com `await` bloqueante | +200-400ms | Edge Function |
| Retry com mesmo modelo `gpt-4o` | +8s no pior caso (dobra o tempo) | Edge Function |

## Plano de Otimizacao (6 acoes)

### 1. Estrategia de modelo em duas camadas
- **Primario**: `gpt-4o-mini` com `detail: "low"` (imagem processada como bloco unico de 512px)
- **Fallback** (apenas se identificacao falhar): `gpt-4o` com `detail: "auto"`
- Economia: ~4-6 segundos na chamada primaria

### 2. Reducao do payload de imagem (Frontend)
- Reduzir `MAX_DIM` de 1280px para 800px
- Reduzir qualidade JPEG de 0.85 para 0.70
- Economia: ~30-40% menos bytes transferidos, upload mais rapido

### 3. Reducao do `max_tokens` de saida
- Primario (`gpt-4o-mini`): `max_tokens: 2048`
- Fallback (`gpt-4o`): `max_tokens: 3072`
- Forca respostas mais concisas sem perder dados essenciais

### 4. Logging fire-and-forget
- Remover `await` de `logUsage` e `recordABResult`
- Executar em background sem bloquear a resposta ao usuario
- Economia: ~200-400ms

### 5. Skip ML por padrao na primeira chamada
- Passar `skipML: true` do frontend por padrao
- ML enhancements rodam apenas em re-scans ou quando o usuario corrige
- Economia: ~100-300ms (3 RPCs eliminados)

### 6. Compactacao do prompt
- Remover exemplos verbosos do prompt (ex: exemplos de `reason` no breakdown)
- Manter as instrucoes essenciais, reduzir de ~4000 para ~2500 tokens de entrada
- Mover os exemplos detalhados para o fallback apenas

## Fluxo Otimizado

```text
CAPTURA (Frontend)
  |-- Redimensiona para 800px, JPEG 0.70
  |-- Envia com skipML: true
  v
EDGE FUNCTION
  |-- Auth check em paralelo (sem ML)
  |-- gpt-4o-mini + detail:low + max_tokens:2048
  |-- logUsage fire-and-forget (sem await)
  v
  Identificou? ----SIM----> Resposta (~3-4s)
       |
      NAO
       |
  gpt-4o + detail:auto + max_tokens:3072
       |
  Resposta (~8-10s no pior caso)
```

## Resultado Esperado

| Cenario | Antes | Depois |
|---------|-------|--------|
| Scan simples (1 carro) | 8-12s | 3-5s |
| Scan complexo (multiplos) | 12-18s | 5-8s |
| Fallback ativado | 16-25s | 8-12s |

## Detalhes Tecnicos

### Arquivos modificados

**`supabase/functions/analyze-collectible/index.ts`**:
- `PRIMARY_MODEL` volta para `gpt-4o-mini`
- `FALLBACK_MODEL` permanece `gpt-4o`
- `imageDetail` primario: `"low"`, fallback: `"auto"`
- `max_tokens` diferenciados por modelo
- `logUsage` e `recordABResult` sem `await`
- Prompt compactado (remover exemplos longos dos criterios de breakdown)

**`src/components/scanner/ScannerView.tsx`**:
- `MAX_DIM` de 1280 para 800
- Qualidade JPEG de 0.85 para 0.70
- Enviar `skipML: true` por padrao em todas as chamadas `invoke("analyze-collectible")`

