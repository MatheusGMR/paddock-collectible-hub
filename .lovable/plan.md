

# Plano: Captura Múltipla de Carros com Carrossel

## Resumo das Mudanças Solicitadas

1. **Limite rigoroso de carros por foto** - Definir e avaliar a quantidade máxima de carros que podem ser identificados em uma única imagem
2. **Exibição em carrossel** - Quando múltiplos carros forem detectados, mostrar cards em formato de carrossel deslizável
3. **Remoção progressiva** - À medida que o usuário adiciona cada carro à coleção, o card desaparece e o próximo é exibido automaticamente

---

## 1. Limite de Carros por Foto

### Análise Técnica
Com base em testes de modelos de visão e considerações práticas:

| Quantidade | Viabilidade | Qualidade da Análise |
|------------|-------------|---------------------|
| 1-2 carros | Excelente | Detecção precisa de todos os detalhes |
| 3-4 carros | Boa | Boa detecção, possível perda de detalhes menores |
| 5-6 carros | Moderada | Detecção básica, raridade/condição imprecisos |
| 7+ carros | Não recomendado | Muitos erros, processamento lento |

**Limite proposto: Máximo de 5 carros por foto**

Este limite equilibra:
- Qualidade da análise individual
- Tempo de resposta aceitável
- Espaço no carrossel mobile

### Implementação no Prompt da IA
O prompt será modificado para:
1. Detectar múltiplos carros na imagem
2. Retornar um array de resultados
3. Limitar a 5 itens, priorizando os mais visíveis/centrais

---

## 2. Nova Estrutura de Resposta da IA

### Formato Atual (um carro)
```json
{
  "identified": true,
  "realCar": { ... },
  "collectible": { ... },
  "priceIndex": { ... }
}
```

### Novo Formato (múltiplos carros)
```json
{
  "identified": true,
  "count": 3,
  "items": [
    {
      "realCar": { ... },
      "collectible": { ... },
      "priceIndex": { ... }
    },
    {
      "realCar": { ... },
      "collectible": { ... },
      "priceIndex": { ... }
    },
    {
      "realCar": { ... },
      "collectible": { ... },
      "priceIndex": { ... }
    }
  ],
  "warning": "Foram detectados 7 carros. Exibindo os 5 mais visíveis."
}
```

---

## 3. Interface de Carrossel

### Layout Visual
```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                         [Imagem Capturada]                              │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ← Deslize para ver mais (2 de 3)                                      │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │   Ferrari 250 GTO                                        ⚡ 87   │  │
│  │   1962                                                           │  │
│  │                                                                   │  │
│  │   Fabricante: Hot Wheels Premium                                 │  │
│  │   Escala: 1:64                                                   │  │
│  │   ...                                                            │  │
│  │                                                                   │  │
│  │   [Adicionar à Coleção] [Pular para Próximo]                     │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│                           ● ○ ○                                         │
│                       (indicadores)                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Comportamento do Carrossel
1. **Swipe horizontal** - Navegar entre os carros detectados
2. **Indicadores de paginação** - Pontos mostrando posição atual
3. **Contador** - "2 de 3" ou "2/3"
4. **Animação suave** - Transição fade/slide entre cards

---

## 4. Fluxo de Adição com Remoção Progressiva

### Comportamento ao Adicionar
```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Usuário adiciona carro #1 à coleção                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Card do carro #1 faz animação de "check" ✓                          │
│       ↓                                                                 │
│  2. Card desliza para fora (animação slide-left + fade)                 │
│       ↓                                                                 │
│  3. Carrossel move automaticamente para carro #2                        │
│       ↓                                                                 │
│  4. Contagem atualiza: "1 de 2" (removeu o #1)                          │
│       ↓                                                                 │
│  5. Se era o último, mostra tela de conclusão                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Opções por Card
| Botão | Ação |
|-------|------|
| **Adicionar à Coleção** | Adiciona o carro, remove card, vai para próximo |
| **Pular** | Mantém na lista mas vai para próximo (pode voltar) |
| **Postar Agora** | Adiciona + abre dialog de post |

### Tela de Conclusão
Após processar todos os carros (ou pular todos):
```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                            ✅                                           │
│                                                                         │
│          3 carros adicionados à coleção!                                │
│                                                                         │
│   [Escanear Novamente]   [Ver Minha Coleção]                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Arquivos a Modificar

### Edge Function
| Arquivo | Mudanças |
|---------|----------|
| `supabase/functions/analyze-collectible/index.ts` | Modificar prompt para detectar múltiplos carros, retornar array, limitar a 5 |

### Componente Scanner
| Arquivo | Mudanças |
|---------|----------|
| `src/components/scanner/ScannerView.tsx` | Novo estado para array de resultados, lógica de carrossel, remoção progressiva |

### Novo Componente
| Arquivo | Propósito |
|---------|-----------|
| `src/components/scanner/ResultCarousel.tsx` | **NOVO** - Componente de carrossel para exibir múltiplos resultados |

### Traduções
| Arquivo | Mudanças |
|---------|----------|
| `src/lib/i18n/translations/pt-BR.ts` | Novos textos para multi-car |
| `src/lib/i18n/translations/en.ts` | Novos textos para multi-car |

---

## 6. Novos Estados no Scanner

```typescript
// Estado atual (um resultado)
const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

// Novos estados (múltiplos resultados)
const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
const [currentResultIndex, setCurrentResultIndex] = useState(0);
const [addedItems, setAddedItems] = useState<Set<number>>(new Set()); // índices já adicionados
const [skippedItems, setSkippedItems] = useState<Set<number>>(new Set()); // índices pulados
```

---

## 7. Novo Prompt para IA

O prompt da Edge Function será atualizado para:

1. **Detectar quantidade** - "Analise a imagem e conte quantos carros colecionáveis estão presentes"
2. **Priorizar visíveis** - "Se houver mais de 5, analise apenas os 5 mais visíveis/centrais"
3. **Retornar array** - "Retorne um array 'items' com cada carro identificado"
4. **Informar excesso** - "Se detectar mais de 5, inclua um campo 'warning' informando"

---

## 8. Novas Traduções

### Português (pt-BR)
```typescript
scanner: {
  // ... existentes
  multipleCarsDetected: "carros detectados",
  swipeToSee: "Deslize para ver todos",
  skipToNext: "Pular",
  addingProgress: "de",
  allItemsProcessed: "Todos processados!",
  itemsAdded: "itens adicionados",
  maxCarsWarning: "Muitos carros na foto. Exibindo os 5 mais visíveis.",
  viewCollection: "Ver Coleção",
}
```

### Inglês (en)
```typescript
scanner: {
  // ... existing
  multipleCarsDetected: "cars detected",
  swipeToSee: "Swipe to see all",
  skipToNext: "Skip",
  addingProgress: "of",
  allItemsProcessed: "All done!",
  itemsAdded: "items added",
  maxCarsWarning: "Too many cars in photo. Showing 5 most visible.",
  viewCollection: "View Collection",
}
```

---

## 9. Estrutura do ResultCarousel

```typescript
interface ResultCarouselProps {
  results: AnalysisResult[];
  capturedImage: string;
  onAddToCollection: (index: number) => Promise<void>;
  onSkip: (index: number) => void;
  onComplete: () => void;
  addedIndices: Set<number>;
}

const ResultCarousel = ({
  results,
  capturedImage,
  onAddToCollection,
  onSkip,
  onComplete,
  addedIndices,
}: ResultCarouselProps) => {
  // Usa Embla Carousel (já instalado)
  // Filtra resultados já adicionados para não exibir
  // Mostra animação de saída quando item é adicionado
  // Mostra tela de conclusão quando todos processados
};
```

---

## Resumo da Implementação

| Passo | Descrição |
|-------|-----------|
| 1 | Modificar prompt da IA para detectar múltiplos carros (máx 5) |
| 2 | Atualizar Edge Function para retornar array de resultados |
| 3 | Criar componente `ResultCarousel` usando Embla |
| 4 | Modificar `ScannerView` para suportar múltiplos resultados |
| 5 | Implementar lógica de remoção progressiva com animações |
| 6 | Adicionar traduções para novos textos |
| 7 | Testar fluxo completo: captura → análise → carrossel → adição |

### Considerações de UX

- **Feedback visual claro** quando um carro é adicionado (animação ✓)
- **Possibilidade de voltar** para carros pulados antes de finalizar
- **Contador visível** mostrando progresso (2 de 3)
- **Botão de conclusão rápida** para adicionar todos de uma vez

