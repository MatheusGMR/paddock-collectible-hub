
# Plano: Upload de Múltiplas Fotos no Scanner

## Contexto

O botão de galeria no canto inferior esquerdo do scanner utiliza o plugin `@capacitor/camera` que, por design do iOS/Android, só permite selecionar **uma foto por vez**. Para permitir upload em lote diretamente no scanner, precisamos integrar o componente `PhotoUploadSheet` que já existe e suporta até 10 fotos.

---

## Solução Proposta

Substituir a ação do botão de galeria para abrir o `PhotoUploadSheet` (que usa `<input type="file" multiple>`) em vez de chamar o picker nativo de foto única.

---

## Mudanças Técnicas

### 1. ScannerView.tsx

**Adicionar import:**
```typescript
import { PhotoUploadSheet } from "@/components/profile/PhotoUploadSheet";
```

**Adicionar estado:**
```typescript
const [showBatchUpload, setShowBatchUpload] = useState(false);
```

**Modificar o botão de galeria:**
- Trocar `onClick={openNativeGallery}` por `onClick={() => setShowBatchUpload(true)}`

**Adicionar o componente no final do JSX:**
```typescript
<PhotoUploadSheet
  open={showBatchUpload}
  onOpenChange={setShowBatchUpload}
  onCollectionUpdated={() => { /* opcional: trigger refresh */ }}
/>
```

### 2. Comportamento

- **Botão de Galeria (canto inferior esquerdo)**: Abre o `PhotoUploadSheet` para seleção múltipla
- **Botão de Captura (centro)**: Continua tirando foto única com a câmera
- **Processamento**: Usa a mesma IA (analyze-collectible) com suporte a até 7 carros por foto

### 3. Fluxo do Usuário

1. Usuário toca no ícone de galeria (📷 canto inferior esquerdo)
2. Abre o sheet de upload com opções "Escolher arquivos" e "Usar câmera"
3. Usuário seleciona até 10 fotos de uma vez
4. Todas são processadas em paralelo (3 simultâneas)
5. Resultados consolidados são apresentados para revisão
6. Usuário seleciona quais itens adicionar à coleção

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/scanner/ScannerView.tsx` | Integrar `PhotoUploadSheet` e estado de controle |

---

## Impacto

- **Mínimo**: Apenas uma adição de import, estado e componente
- **Sem breaking changes**: Captura de câmera continua funcionando igual
- **Reutilização**: Aproveita toda a lógica de batch upload já implementada
