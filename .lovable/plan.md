

# Experiência Fluida de Upload em Massa de Fotos

## Resumo Executivo

Este plano implementa uma experiência otimizada para upload de múltiplas fotos, permitindo que o usuário selecione várias imagens de uma vez e receba os resultados de forma organizada e fluida para revisar e adicionar à coleção.

---

## Análise da Capacidade Atual

### Limites Identificados

| Recurso | Limite Atual | Impacto |
|---------|--------------|---------|
| **Edge Function Timeout** | 30 segundos (padrão Supabase) | Análise de 1 imagem leva ~5-8s |
| **Processamento Sequencial** | 1 foto por vez | 10 fotos = ~50-80 segundos de espera |
| **Memória do Navegador** | Base64 de imagens | 20 fotos de 3MB = ~60MB em RAM |
| **Rate Limit da IA** | Configurado no workspace Lovable | Muitas chamadas simultâneas podem falhar |
| **Tamanho de Vídeo** | 20MB máximo | Já validado no código |

### Dados de Performance Real
- **Média de tokens por análise**: ~7.600 tokens
- **Tempo estimado por foto**: 5-8 segundos
- **Cada foto detecta até 5 carros** (cropping individual incluído)

---

## Recomendações de Limites

### Cenário 1: Processamento Síncrono (Sem Background)
**Limite sugerido: 10 fotos por lote**

| Fotos | Tempo Estimado | Experiência |
|-------|----------------|-------------|
| 5 | 25-40s | Excelente |
| 10 | 50-80s | Aceitável com loading facts |
| 15+ | 75-120s+ | Frustrante, risco de timeout |

### Cenário 2: Processamento em Background (Futuro)
**Limite sugerido: 50+ fotos por lote**

Requeriria:
- Tabela de jobs no banco de dados
- Edge Function para criar job
- Cron ou worker para processar em lotes
- Notificação push quando concluído

---

## Proposta de Implementação

### Fase 1: Experiência Fluida (Síncrona) - Implementação Imediata

```text
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DO USUÁRIO                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. SELEÇÃO          2. FILA VISUAL        3. RESULTADOS    │
│  ┌──────────┐        ┌──────────────┐      ┌─────────────┐  │
│  │ Escolher │   →    │ Grid com     │  →   │ Carrossel   │  │
│  │ até 10   │        │ status de    │      │ unificado   │  │
│  │ fotos    │        │ cada foto    │      │ de TODOS    │  │
│  └──────────┘        └──────────────┘      │ os carros   │  │
│                                            └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Componentes a Modificar

**1. PhotoUploadSheet - Melhorias na UX**
- Adicionar limite visual de 10 fotos
- Contador regressivo mostrando "X de 10 selecionadas"
- Grid de thumbnails com status individual (pending/analyzing/success/error)
- Progresso geral: "Analisando foto 3 de 10"
- Botão para cancelar processamento

**2. Processamento Paralelo Controlado**
- Processar 2-3 fotos simultaneamente (não sequencial)
- Reduz tempo total de ~80s para ~30s para 10 fotos
- Respeita rate limits sem sobrecarregar

**3. Consolidação de Resultados**
- Após todas as fotos processadas, exibir carrossel único com TODOS os carros detectados
- Cada card indica "Foto 1", "Foto 2" para contexto
- Seleção em massa: "Adicionar todos" ou "Adicionar selecionados"
- Chip de contagem: "12 carros encontrados em 8 fotos"

**4. Persistência Temporária**
- Salvar resultados no localStorage enquanto usuário revisa
- Se app fechar, usuário pode continuar de onde parou
- Expiração de 24h para dados temporários

---

### Fase 2: Processamento em Background (Futuro)

Para lotes maiores (10+ fotos), implementar sistema de jobs:

```text
┌─────────────────────────────────────────────────────────────┐
│                ARQUITETURA BACKGROUND                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  UPLOAD          STORAGE          EDGE FUNCTION    NOTIFY   │
│  ┌──────┐       ┌───────┐        ┌──────────┐     ┌─────┐  │
│  │Fotos │  →    │Bucket │   →    │Processar │  →  │Push │  │
│  │para  │       │upload_│        │em lotes  │     │ao   │  │
│  │bucket│       │queue  │        │de 5      │     │user │  │
│  └──────┘       └───────┘        └──────────┘     └─────┘  │
│                                                             │
│  BANCO DE DADOS                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ upload_jobs: id, user_id, status, photos[], results[]  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Esta fase requer:**
- Nova tabela `upload_jobs`
- Bucket de Storage `upload-queue`
- Edge Function `process-upload-batch`
- Integração com sistema de push existente
- UI de "Jobs em andamento" no perfil

---

## Detalhes Técnicos (Fase 1)

### Arquivo: `src/components/profile/PhotoUploadSheet.tsx`

**Mudanças principais:**

1. **Constante de limite**
```typescript
const MAX_PHOTOS_PER_BATCH = 10;
const PARALLEL_PROCESSING_LIMIT = 3;
```

2. **Processamento paralelo com controle**
```typescript
const processQueueParallel = async (queue: QueuedMedia[]) => {
  const chunks = chunkArray(queue, PARALLEL_PROCESSING_LIMIT);
  for (const chunk of chunks) {
    await Promise.all(chunk.map(media => analyzeMedia(media)));
  }
};
```

3. **Consolidação de resultados**
```typescript
const allResults = mediaQueue
  .filter(m => m.status === 'success')
  .flatMap((m, photoIndex) => 
    m.results.map(r => ({ ...r, photoIndex }))
  );
```

4. **Ações em massa**
```typescript
const handleAddAll = async () => {
  for (const result of selectedResults) {
    await handleAddToCollection(result);
  }
};
```

### Novo Componente: `BatchResultsView.tsx`

Exibe todos os carros detectados em um grid/carrossel:
- Checkbox para seleção múltipla
- Indicador de foto de origem
- Status de duplicata destacado
- Botões: "Adicionar selecionados" | "Pular todos"

### UI/UX Melhorada

**Durante upload:**
- Grid 3x4 de thumbnails com status animado
- Barra de progresso global
- Estimativa de tempo restante
- Fatos curiosos rotativos (já existe)

**Após processamento:**
- Resumo: "12 carros encontrados em 8 fotos (3 já na coleção)"
- Filtros: Todos | Novos | Duplicados
- Seleção em massa com visual de checklist

---

## Estimativa de Implementação

| Tarefa | Complexidade | Tempo |
|--------|--------------|-------|
| Limite de 10 fotos + validação | Baixa | 30min |
| Processamento paralelo | Média | 1h |
| Consolidação de resultados | Média | 1h |
| Grid de seleção em massa | Média | 1.5h |
| Persistência localStorage | Baixa | 30min |
| Testes e refinamentos | Média | 1h |
| **Total Fase 1** | | **~5h** |

---

## Recomendação

**Implementar a Fase 1** resolve 90% dos casos de uso (usuários querendo subir várias fotos da gaveta de coleção) sem complexidade de infraestrutura adicional.

A Fase 2 (background) pode ser implementada posteriormente se houver demanda por lotes maiores (50+ fotos) ou se o feedback indicar necessidade.

**Limite recomendado: 10 fotos por vez**, com processamento paralelo de 3 simultâneas, reduzindo o tempo total para ~25-30 segundos para um lote completo.

