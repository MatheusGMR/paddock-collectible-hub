

# Correcao do Scanner - Analise de Imagem

## Diagnostico (baseado nos logs do terminal)

### O que os logs revelam

Os logs mostram que o scanner **captura a imagem corretamente** (base64 length ~330K), mas falha em dois pontos distintos:

**Problema 1 - Resposta da IA sem formato esperado (scans 1 e 2)**
- A IA retorna JSON valido mas sem as chaves obrigatorias que o app espera (`identified`, `items`, `count`)
- O prompt atual descreve os campos de cada item mas nunca especifica a estrutura JSON de resposta
- O `shouldRetry` dispara para ambos os modelos (primario e fallback), e o resultado fica como "nao identificado"
- Evidencia: ambos os scans receberam respostas da IA (841-2228 chars) mas o app tratou como erro

**Problema 2 - Truncamento de imagem por memoria do iOS (scan 3+)**
- Apos multiplos scans, o WebView do iOS entra em pressao de memoria
- Os logs mostram "Decoding incomplete with error code -1" repetidamente
- O base64 da imagem e truncado de ~330K para apenas 380 caracteres antes de chegar no servidor
- Evidencia no log: `base64 length: 380` na Edge Function vs `base64 length: 330179` no cliente

**Erros do terminal que NAO sao problemas:**
- `UIScene lifecycle` - aviso informativo do iOS, sem impacto
- `Unable to simultaneously satisfy constraints` - conflito de layout interno do UIKit (botoes de navegacao), nao afeta a WebView
- `FigXPCUtilities signalled err=-17281` - erros da camera ao iniciar/parar, ja recuperados automaticamente
- `RTIInputSystemClient` - erros de sessao de teclado, sem impacto

---

## Solucao

### 1. Adicionar estrutura JSON explicita ao prompt (Edge Function)

No `BASE_PROMPT`, adicionar um bloco claro com o formato de resposta esperado:

```text
FORMATO OBRIGATORIO DE RESPOSTA:
Para colecionaveis:
{"identified":true, "detectedType":"collectible", "count":N, "items":[...]}

Para carros reais:
{"identified":true, "detectedType":"real_car", "car":{...}, "searchTerms":[], "confidence":"high"}

NUNCA use chaves diferentes de "items" para a lista.
```

Isso elimina a ambiguidade que faz a IA usar chaves como `vehicles`, `carros` ou `results`.

### 2. Mudar resolucao da imagem para "auto" no modelo primario

Alterar `detail: "low"` para `detail: "auto"` no gpt-4o-mini. O `detail: "low"` limita a imagem a 512x512, insuficiente para miniaturas pequenas. O custo extra e minimo.

### 3. Normalizar resposta no servidor (Edge Function)

Antes de retornar o resultado, adicionar normalizacao server-side que:
- Verifica chaves alternativas (`vehicles`, `carros`, `results`, `data`) e mapeia para `items`
- Garante que `identified`, `count`, `items` e `detectedType` sempre existam
- Isso funciona como segunda camada alem da normalizacao do frontend

### 4. Corrigir logica de fallback

Quando ambos os modelos falham `shouldRetry`, usar o resultado do **fallback** (gpt-4o, maior qualidade) em vez do primario.

### 5. Liberar memoria entre scans (Frontend)

No `ScannerView.tsx`, ao iniciar um novo scan:
- Limpar `capturedImage` (libera a string base64 anterior da memoria)
- Limpar `analysisResults`
- Isso reduz a pressao de memoria no WebView do iOS

---

## Detalhes Tecnicos

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/analyze-collectible/index.ts` | Adicionar schema JSON ao prompt, mudar detail para auto, corrigir fallback, normalizar resposta |
| `src/components/scanner/ScannerView.tsx` | Liberar memoria (capturedImage/results) antes de novo scan |

### Mudancas especificas na Edge Function

**No `BASE_PROMPT`:** Adicionar bloco com formato JSON obrigatorio incluindo chaves exatas esperadas.

**Na funcao `fetchAndParse`:** Mudar `const imageDetail = isFallback ? "auto" : "low"` para `const imageDetail = "auto"`.

**Na logica de retry (linhas 288-297):** Quando ambos falham shouldRetry, preferir o fallback:
```text
} else {
  // Both failed - prefer fallback (gpt-4o, higher quality)
  result = fallback.parsed;
}
```

**Antes do retorno:** Adicionar normalizacao de chaves alternativas para `items`.

### Mudancas no Frontend

**Antes de cada captura:** Adicionar limpeza de estado para liberar memoria:
```text
setCapturedImage(null);
setAnalysisResults([]);
```

