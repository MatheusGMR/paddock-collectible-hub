

## Plano: Botão X reinicia a câmera ao invés de fechar o scanner

### Problema
Atualmente, ao pressionar X após uma captura, o `handleClose` salva resultados pendentes e navega para `/`, saindo do scanner. O usuário quer que o X reinicie o processo de captura (reabra a câmera).

### Solução

**Arquivo: `src/components/scanner/ScannerView.tsx`**

Modificar o comportamento do botão X conforme o estado:

1. **Se há resultados/captura em andamento** (`hasResults || capturedImage`): o X chama `resetScan()` para limpar tudo e reabrir a câmera
2. **Se está na tela inicial da câmera** (sem resultados): o X fecha o scanner e navega para `/` (comportamento atual do `handleClose`)

Isso significa alterar o `onClick` do botão X (linha ~2424) para chamar uma nova função que decide entre `resetScan` e `handleClose` baseado no estado atual:

```typescript
const handleXButton = useCallback(() => {
  if (hasResults || capturedImage || realCarResult || imageQualityError) {
    resetScan();
  } else {
    handleClose();
  }
}, [hasResults, capturedImage, realCarResult, imageQualityError, resetScan, handleClose]);
```

O botão X usará `handleXButton` ao invés de `handleClose`.

### Resultado
- Após captura/análise, X = reinicia câmera para nova captura
- Na tela da câmera (sem resultados), X = sai do scanner

