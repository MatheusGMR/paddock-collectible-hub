

# Plano: Corrigir vite.config.ts para Capacitor + Lovable

## Problema Identificado

O build do Vite está gerando caminhos absolutos:
```html
<script type="module" src="/assets/index-XXX.js"></script>
```

Quando deveria gerar caminhos relativos:
```html
<script type="module" src="assets/index-XXX.js"></script>
```

## Causa

O `base: './'` precisa estar configurado, MAS a edição anterior removeu configurações necessárias do Lovable (como `server.port: 8080`).

## Solução

Atualizar o `vite.config.ts` com a configuração completa:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  base: './',
  server: {
    host: '::',
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

## O que cada configuração faz

| Configuração | Propósito |
|--------------|-----------|
| `base: './'` | **CRÍTICO** - Gera caminhos relativos para Capacitor/iOS |
| `server.port: 8080` | Necessário para preview do Lovable |
| `server.host: '::'` | Permite acesso de qualquer IP |
| `resolve.alias` | Mantém imports com `@/` funcionando |

## Passos Após a Correção

1. **No Lovable**: Vou aplicar a correção
2. **No seu Mac**: 
   - `git pull` para pegar a atualização
   - `npm run build`
   - Verificar: `grep -E "script|link" dist/index.html`
   - Deve mostrar `src="assets/..."` (sem `/` inicial)
3. **Sincronizar iOS**:
   - `npx cap sync ios`
4. **No Xcode**:
   - Product → Clean Build Folder
   - Run ▶️

## Resultado Esperado

Após o build correto, o `dist/index.html` terá:
```html
<script type="module" src="assets/index-XXX.js"></script>
<link rel="stylesheet" href="assets/index-XXX.css">
```

E o app iOS carregará normalmente após o LaunchScreen.

