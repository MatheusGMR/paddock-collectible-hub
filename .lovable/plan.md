
# Plano: Validação de Qualidade de Imagem com Feedback Instantâneo

## Problema Identificado

Atualmente, quando a foto tem problemas (muitos carros, má iluminação, distância inadequada), o sistema processa a imagem inteira antes de informar o usuário. Isso desperdiça tempo e recursos.

## Solução Proposta

Adicionar uma **etapa de pré-validação rápida** que:
1. Avalia a qualidade da imagem ANTES da análise completa
2. Detecta problemas comuns e para o processo imediatamente
3. Fornece instruções claras e simples para o usuário corrigir

---

## 1. Nova Estrutura de Resposta da IA

### Adicionar Campo de Validação
A resposta da IA passará a incluir um campo `imageQuality` que é avaliado primeiro:

```json
{
  "imageQuality": {
    "isValid": true | false,
    "issues": [
      {
        "type": "too_many_cars" | "poor_lighting" | "too_far" | "too_close" | "blurry" | "obstructed",
        "severity": "error" | "warning",
        "message": "Descrição do problema"
      }
    ],
    "suggestion": "Dica simples para corrigir"
  },
  "identified": true,
  "count": 3,
  "items": [...]
}
```

---

## 2. Tipos de Problemas a Detectar

| Problema | Tipo | Critério | Mensagem para o Usuário |
|----------|------|----------|-------------------------|
| **Muitos carros** | `too_many_cars` | > 5 carros visíveis | "Muitos carrinhos na foto! Fotografe no máximo 5 por vez." |
| **Iluminação ruim** | `poor_lighting` | Imagem muito escura/clara | "A iluminação está ruim. Tente em um lugar mais claro." |
| **Muito longe** | `too_far` | Carros muito pequenos na imagem | "Os carrinhos estão muito longe. Aproxime a câmera." |
| **Muito perto** | `too_close` | Carros cortados/muito grandes | "Muito perto! Afaste um pouco para capturar todo o carrinho." |
| **Foto borrada** | `blurry` | Imagem sem foco | "A foto está borrada. Segure firme e tente novamente." |
| **Obstruído** | `obstructed` | Objetos bloqueando a visão | "Algo está bloqueando a visão. Remova obstáculos." |

---

## 3. Tela de Erro com Instruções

Quando um problema for detectado, mostrar tela amigável:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                         [Imagem Capturada]                              │
│                              (escurecida)                               │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                        ⚠️ Ops! Temos um problema                        │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │   📸  Muitos carrinhos na foto!                                  │  │
│  │                                                                   │  │
│  │   Detectamos 8 carros, mas o máximo é 5.                         │  │
│  │                                                                   │  │
│  │   💡 Dica: Fotografe grupos menores para melhor                  │  │
│  │       precisão na identificação.                                  │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│                    [  📷  Tentar Novamente  ]                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Arquivos a Modificar

### Edge Function
| Arquivo | Mudanças |
|---------|----------|
| `supabase/functions/analyze-collectible/index.ts` | Adicionar validação de qualidade de imagem no prompt, retornar `imageQuality` antes de processar |

### Componente Scanner
| Arquivo | Mudanças |
|---------|----------|
| `src/components/scanner/ScannerView.tsx` | Verificar `imageQuality.isValid` antes de mostrar resultados, exibir tela de erro com instruções |

### Novo Componente
| Arquivo | Propósito |
|---------|-----------|
| `src/components/scanner/ImageQualityError.tsx` | **NOVO** - Componente para exibir erros de qualidade com instruções visuais |

### Traduções
| Arquivo | Mudanças |
|---------|----------|
| `src/lib/i18n/translations/pt-BR.ts` | Novos textos para erros de qualidade |
| `src/lib/i18n/translations/en.ts` | Novos textos para erros de qualidade |

---

## 5. Modificação do Prompt da IA

Adicionar ao início do prompt:

```
BEFORE analyzing the cars, first evaluate the IMAGE QUALITY:

1. COUNT how many collectible cars are visible
   - If more than 5: Mark as "too_many_cars" error
   
2. CHECK lighting conditions
   - Too dark (hard to see details): Mark as "poor_lighting"
   - Overexposed (washed out): Mark as "poor_lighting"
   
3. CHECK distance/framing
   - Cars appear very small (< 10% of frame): Mark as "too_far"
   - Cars cut off or filling >90% of frame: Mark as "too_close"
   
4. CHECK focus/clarity
   - Blurry/out of focus: Mark as "blurry"
   - Objects blocking view: Mark as "obstructed"

If ANY "error" level issue is found, return ONLY the imageQuality object without analyzing the cars:
{
  "imageQuality": {
    "isValid": false,
    "issues": [...],
    "suggestion": "..."
  },
  "identified": false,
  "count": 0,
  "items": []
}
```

---

## 6. Novas Traduções

### Português (pt-BR)
```typescript
scanner: {
  // ... existentes
  imageQualityError: "Ops! Temos um problema",
  issueTypes: {
    too_many_cars: "Muitos carrinhos na foto!",
    too_many_cars_desc: "Detectamos {{count}} carros, mas o máximo é 5.",
    too_many_cars_tip: "Fotografe grupos menores para melhor precisão.",
    
    poor_lighting: "Iluminação inadequada",
    poor_lighting_desc: "A foto está muito escura ou clara.",
    poor_lighting_tip: "Tente em um ambiente com luz natural ou uniforme.",
    
    too_far: "Distância muito grande",
    too_far_desc: "Os carrinhos estão muito pequenos na foto.",
    too_far_tip: "Aproxime a câmera dos carrinhos.",
    
    too_close: "Muito perto",
    too_close_desc: "Os carrinhos estão cortados na foto.",
    too_close_tip: "Afaste um pouco para capturar todos por inteiro.",
    
    blurry: "Foto borrada",
    blurry_desc: "A imagem está fora de foco.",
    blurry_tip: "Segure firme e aguarde o foco antes de capturar.",
    
    obstructed: "Visão obstruída",
    obstructed_desc: "Algo está bloqueando a visão dos carrinhos.",
    obstructed_tip: "Remova objetos que estejam na frente.",
  },
  retryCapture: "Tentar Novamente",
}
```

### Inglês (en)
```typescript
scanner: {
  // ... existing
  imageQualityError: "Oops! There's a problem",
  issueTypes: {
    too_many_cars: "Too many cars in the photo!",
    too_many_cars_desc: "We detected {{count}} cars, but the limit is 5.",
    too_many_cars_tip: "Photograph smaller groups for better accuracy.",
    
    poor_lighting: "Poor lighting",
    poor_lighting_desc: "The photo is too dark or too bright.",
    poor_lighting_tip: "Try in an area with natural or even lighting.",
    
    too_far: "Too far away",
    too_far_desc: "The cars appear too small in the photo.",
    too_far_tip: "Move the camera closer to the cars.",
    
    too_close: "Too close",
    too_close_desc: "The cars are cut off in the photo.",
    too_close_tip: "Move back a bit to capture them fully.",
    
    blurry: "Blurry photo",
    blurry_desc: "The image is out of focus.",
    blurry_tip: "Hold steady and wait for focus before capturing.",
    
    obstructed: "View obstructed",
    obstructed_desc: "Something is blocking the view of the cars.",
    obstructed_tip: "Remove objects that are in the way.",
  },
  retryCapture: "Try Again",
}
```

---

## 7. Componente ImageQualityError

```typescript
interface ImageQualityErrorProps {
  issues: Array<{
    type: string;
    severity: "error" | "warning";
    message: string;
  }>;
  suggestion: string;
  capturedImage: string;
  onRetry: () => void;
}
```

### Características do Componente
- Imagem capturada ao fundo (escurecida com overlay)
- Ícone de alerta grande e amigável
- Título do problema principal
- Descrição clara do que está errado
- Dica visual com ícone de lâmpada
- Botão grande para tentar novamente

---

## 8. Fluxo Atualizado

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Fluxo de Captura com Validação                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Usuário captura foto                                                   │
│       ↓                                                                 │
│  IA avalia qualidade da imagem (RÁPIDO)                                 │
│       ↓                                                                 │
│  ┌─────────────────┐       ┌─────────────────┐                          │
│  │ Qualidade OK?   │──Sim──│ Analisa carros  │                          │
│  │   (isValid)     │       │   normalmente   │                          │
│  └────────┬────────┘       └─────────────────┘                          │
│           │                                                             │
│          Não                                                            │
│           ↓                                                             │
│  ┌─────────────────────────────────────────┐                            │
│  │  PARA o processo imediatamente!         │                            │
│  │                                         │                            │
│  │  Mostra tela de erro com:               │                            │
│  │  • Problema identificado                │                            │
│  │  • Dica simples para corrigir           │                            │
│  │  • Botão "Tentar Novamente"             │                            │
│  └─────────────────────────────────────────┘                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Resumo da Implementação

| Passo | Descrição |
|-------|-----------|
| 1 | Modificar prompt da IA para avaliar qualidade primeiro |
| 2 | Criar componente `ImageQualityError.tsx` para exibir erros |
| 3 | Modificar `ScannerView.tsx` para verificar `imageQuality.isValid` |
| 4 | Se inválido, mostrar erro imediatamente (sem processar carros) |
| 5 | Adicionar traduções em PT e EN para todas as mensagens |
| 6 | Testar fluxo completo com diferentes cenários de erro |

### Benefícios
- **Feedback instantâneo** - usuário sabe do problema em segundos
- **Instruções claras** - linguagem simples e direta
- **Menor consumo** - não processa imagens ruins
- **Melhor UX** - guia o usuário para o sucesso
