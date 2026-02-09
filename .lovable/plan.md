

## Deteccao em Tempo Real no Viewfinder do Scanner

### Objetivo
Adicionar um indicador visual no feed da camera que orienta o usuario se carrinhos estao sendo detectados no enquadramento, antes mesmo de capturar a foto.

### Abordagem Tecnica

A solucao mais viavel e usar **TensorFlow.js com o modelo COCO-SSD** para deteccao de objetos no dispositivo (on-device), sem chamadas de API. Esse modelo e leve (~5MB), roda no browser e consegue identificar objetos da classe "car" em tempo real.

### Como Funciona

1. O modelo COCO-SSD roda localmente no browser/WebView
2. A cada ~1.5 segundos, um frame do video e analisado
3. Se objetos "car" forem detectados, um indicador visual muda de estado
4. Nenhuma chamada de API e feita - tudo roda no dispositivo

### Interface Visual

O indicador sera sutil e nao-intrusivo, posicionado na parte inferior do viewfinder:

- **Sem deteccao:** Texto discreto "Aponte para um carrinho" com icone cinza pulsante
- **Detectando:** Badge verde com "N carrinho(s) detectado(s)" com animacao suave de entrada
- **Transicao:** Fade suave entre estados para evitar flickering

### Limitacoes e Mitigacoes

| Limitacao | Mitigacao |
|-----------|-----------|
| COCO-SSD detecta "car" genericamente (real ou miniatura) | Aceitavel - serve como guia de enquadramento, nao como identificacao |
| No modo nativo (camera-preview no iOS), nao ha acesso direto aos frames do video | O indicador funciona apenas no modo web (getUserMedia). No nativo, mantemos o UX atual |
| Modelo adiciona ~5MB ao bundle | Carregamento lazy - so baixa o modelo quando o scanner e aberto |
| Pode haver falsos negativos em miniaturas muito pequenas | Texto de fallback "Aponte para um carrinho" permanece visivel |

### Plano de Implementacao

**1. Instalar dependencia**
- Adicionar `@tensorflow/tfjs` e `@tensorflow-models/coco-ssd`

**2. Criar hook `useObjectDetection.ts`**
- Carrega o modelo COCO-SSD de forma lazy (apenas quando chamado)
- Recebe uma ref de video e retorna objetos detectados
- Intervalo de analise: ~1500ms para balancear performance/responsividade
- Filtra apenas objetos da classe "car", "truck", "bus" com confianca > 50%
- Limpa o intervalo automaticamente no unmount

**3. Criar componente `DetectionIndicator.tsx`**
- Recebe a contagem de carros detectados
- Exibe o badge animado com feedback visual
- Posicionado logo acima do texto "Toque para capturar"

**4. Integrar no `ScannerView.tsx`**
- Conectar o hook ao `videoRef` existente (modo web apenas)
- Renderizar o `DetectionIndicator` entre as guias de canto e os controles inferiores
- Desativar deteccao quando: esta escaneando, tem imagem capturada, ou esta em modo nativo

### Secao Tecnica

```text
Fluxo de dados:

  videoRef (HTMLVideoElement)
       |
       v
  useObjectDetection (a cada 1.5s)
       |
       +--> canvas offscreen (drawImage)
       +--> model.detect(canvas)
       +--> filtra classe "car" | "truck"
       |
       v
  detectedCount: number
       |
       v
  DetectionIndicator (UI)
       +--> 0 carros: "Aponte para um carrinho" (cinza)
       +--> 1+ carros: "N carrinho(s) detectado(s)" (verde)
```

O modelo COCO-SSD sera carregado com `@tensorflow/tfjs-backend-webgl` para usar aceleracao GPU quando disponivel, garantindo que a deteccao nao impacte a fluidez do feed da camera.

