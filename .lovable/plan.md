

## Plano: Corrigir Conflito de Dependência do Camera Preview

### Problema Identificado
O `package.json` especifica `@capacitor-community/camera-preview@^6.0.1`, que requer `@capacitor/core@^6.0.0`. Porém o projeto usa `@capacitor/core@8.0.2`, causando o erro de dependência.

### Solução
Atualizar a versão do `@capacitor-community/camera-preview` para `^7.0.0`, que é compatível com Capacitor 8.

### Alteração

**Arquivo:** `package.json`
- Linha 17: Alterar de `"@capacitor-community/camera-preview": "^6.0.1"` para `"@capacitor-community/camera-preview": "^7.0.0"`

### Após a Correção

Execute novamente os comandos:
```bash
npm install
npx cap sync
```

### Observação
O `npx cap sync` já mostrou que o iOS está usando a versão 7.0.4 corretamente. Esta correção apenas alinha o `package.json` com o que já está funcionando no lado nativo.

