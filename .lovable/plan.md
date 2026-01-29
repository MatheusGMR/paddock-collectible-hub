
# Plano: Câmera Aprimorada com Captura de Foto/Vídeo e Índice 100 Pontos

## Resumo das Mudanças Solicitadas

1. **Índice de Valor = 100 pontos** - Manter a soma total em 100 para facilitar a contagem
2. **Análise mais rápida** - Otimizar o modelo de IA para velocidade sem perder qualidade
3. **Botão de câmera redesenhado** - Trocar "Capture & Analyze" por um botão de câmera circular com símbolo de IA/raio sutil
4. **Captura dupla (foto/vídeo)** - Clique = foto, segurar = gravar vídeo
5. **Postar vídeo no perfil** - Após gravar, poder compartilhar na rede

---

## 1. Índice de Valor = 100 Pontos

### Situação Atual
O sistema já está configurado para totalizar 100 pontos:
- Raridade: 35 pts
- Condição: 25 pts
- Fabricante: 15 pts
- Escala: 10 pts
- Idade: 10 pts
- Origem: 5 pts
- **Total: 100 pts** ✓

### Ação
Nenhuma mudança necessária - o sistema já está correto! Apenas confirmarei que o prompt da IA reforça isso.

---

## 2. Análise Mais Rápida

### Mudança Proposta
Trocar o modelo de IA de `openai/gpt-5` para `google/gemini-3-flash-preview`:
- Modelo mais rápido
- Excelente para análise de imagens
- Mantém qualidade para identificação de colecionáveis

### Arquivo a Modificar
- `supabase/functions/analyze-collectible/index.ts`
  - Linha 144: trocar `model: "openai/gpt-5"` por `model: "google/gemini-3-flash-preview"`

---

## 3. Botão de Câmera Redesenhado

### Design Atual
```text
┌─────────────────────────────────────┐
│  Posicione o item no centro         │
│                                     │
│  [    📷 Capture & Analyze    ]     │ ← Botão retangular com texto
│                                     │
└─────────────────────────────────────┘
```

### Novo Design
```text
┌─────────────────────────────────────┐
│  Posicione o item no centro         │
│                                     │
│            ╭─────────╮              │
│            │   ⚡    │              │ ← Botão circular grande
│            │   ◯    │              │    com ícone de raio/IA sutil
│            ╰─────────╯              │
│    Toque para foto • Segure para    │
│              gravar vídeo           │
└─────────────────────────────────────┘
```

### Novo Componente
Criar `src/components/scanner/CaptureButton.tsx`:
- Botão circular grande (80x80px ou similar)
- Ícone de raio (Zap do Lucide) centralizado, em tom sutil (primary/30)
- Círculo interno quando pressionado para indicar gravação
- Estados visuais:
  - Padrão: círculo branco com raio sutil
  - Hover/pressionado: escala ligeiramente
  - Gravando: anel vermelho pulsante ao redor

---

## 4. Captura Dupla: Foto + Vídeo

### Comportamento
| Interação | Ação | Resultado |
|-----------|------|-----------|
| Clique rápido (< 500ms) | Captura foto | Mesmo comportamento atual |
| Segurar (> 500ms) | Inicia gravação de vídeo | Grava até soltar ou limite de 30s |
| Soltar após segurar | Para gravação | Mostra preview do vídeo |

### Implementação Técnica

#### Estados Novos em `ScannerView.tsx`
```typescript
const [isRecording, setIsRecording] = useState(false);
const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
const [recordingDuration, setRecordingDuration] = useState(0);
const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const chunksRef = useRef<Blob[]>([]);
const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
```

#### Handlers para o Botão
```typescript
const handlePressStart = () => {
  // Inicia timer - se segurar > 500ms, começa gravação
  pressTimerRef.current = setTimeout(() => {
    startRecording();
  }, 500);
};

const handlePressEnd = () => {
  // Se timer ainda ativo, foi clique rápido = foto
  if (pressTimerRef.current) {
    clearTimeout(pressTimerRef.current);
    pressTimerRef.current = null;
    capturePhoto();
  } else if (isRecording) {
    // Estava gravando, para o vídeo
    stopRecording();
  }
};
```

#### Funções de Gravação
```typescript
const startRecording = async () => {
  if (!streamRef.current) return;
  
  const mediaRecorder = new MediaRecorder(streamRef.current, {
    mimeType: 'video/webm;codecs=vp9'
  });
  
  chunksRef.current = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunksRef.current.push(e.data);
  };
  
  mediaRecorder.onstop = () => {
    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
    setRecordedVideo(blob);
  };
  
  mediaRecorder.start();
  mediaRecorderRef.current = mediaRecorder;
  setIsRecording(true);
};

const stopRecording = () => {
  mediaRecorderRef.current?.stop();
  setIsRecording(false);
};
```

---

## 5. Postar Vídeo no Perfil

### Fluxo Após Gravar Vídeo
```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Fluxo de Vídeo                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Usuário segura botão                                                   │
│       ↓                                                                 │
│  Grava vídeo (max 30s)                                                  │
│       ↓                                                                 │
│  Solta o botão → Para gravação                                          │
│       ↓                                                                 │
│  Mostra preview do vídeo                                                │
│       ↓                                                                 │
│  ┌─────────────────────────────────────┐                                │
│  │  [▶️ Preview do Vídeo]              │                                │
│  │                                     │                                │
│  │  [Postar Vídeo]  [Gravar Outro]     │                                │
│  └─────────────────────────────────────┘                                │
│       ↓                                                                 │
│  [Postar Vídeo] → Abre CreatePostDialog com vídeo                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Nota sobre Análise de Vídeo
Para vídeos, não faremos análise automática da IA (seria lento demais). O usuário posta o vídeo direto, sem adicionar à coleção. Para adicionar à coleção, precisa usar foto.

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `supabase/functions/analyze-collectible/index.ts` | Trocar modelo para Gemini Flash |
| `src/components/scanner/ScannerView.tsx` | Adicionar estados/lógica de vídeo, substituir botão |
| `src/components/scanner/CaptureButton.tsx` | **NOVO** - Botão circular com ícone IA |
| `src/lib/i18n/translations/pt-BR.ts` | Adicionar textos de vídeo |
| `src/lib/i18n/translations/en.ts` | Adicionar textos de vídeo |
| `src/components/posts/CreatePostDialog.tsx` | Suportar vídeo além de imagem |
| `src/lib/api/posts.ts` | Função para upload de vídeo |

---

## Novas Traduções

### Português (pt-BR)
```typescript
scanner: {
  // ... existentes
  holdToRecord: "Segure para gravar vídeo",
  recording: "Gravando...",
  tapToCapture: "Toque para foto",
  videoRecorded: "Vídeo gravado!",
  postVideo: "Postar Vídeo",
  recordAgain: "Gravar Outro",
  maxDuration: "Máximo 30 segundos",
}
```

### Inglês (en)
```typescript
scanner: {
  // ... existing
  holdToRecord: "Hold to record video",
  recording: "Recording...",
  tapToCapture: "Tap to capture",
  videoRecorded: "Video recorded!",
  postVideo: "Post Video",
  recordAgain: "Record Again",
  maxDuration: "Maximum 30 seconds",
}
```

---

## Detalhes do CaptureButton

### Visual do Componente
```text
        ╭──────────────────╮
        │                  │
        │    ╭────────╮    │
        │    │   ⚡   │    │  ← Raio sutil (opacity 30%)
        │    │        │    │
        │    ╰────────╯    │
        │                  │
        ╰──────────────────╯
              80x80px
          Borda branca 3px
```

### Estados Visuais
| Estado | Visual |
|--------|--------|
| Normal | Círculo branco com raio azul sutil |
| Hover | Escala 1.05x |
| Pressionado | Escala 0.95x, fundo ligeiramente azul |
| Gravando | Anel vermelho pulsante, duração exibida |

---

## Resumo da Implementação

1. **Modelo IA mais rápido** → 1 linha de mudança
2. **Botão de captura redesenhado** → Novo componente
3. **Gravação de vídeo** → Estados + MediaRecorder API
4. **Postar vídeo** → Extensão do CreatePostDialog
5. **Traduções** → Novos textos em PT/EN

O índice já totaliza 100 pontos, então essa parte está pronta!
