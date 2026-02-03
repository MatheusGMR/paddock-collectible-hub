

# Plano: Adicionar Indicador Visual de Versão para Debug

## Objetivo
Adicionar um indicador visual temporário ("BUILD v2") no header do Profile para confirmar se o bundle local está sendo carregado corretamente no app nativo iOS.

---

## Alteração

### Arquivo: `src/components/profile/ProfileHeader.tsx`

Adicionar um badge/texto visível ao lado do logo ou dos botões do header:

```typescript
// No header, adicionar um indicador visual temporário
<span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded">
  BUILD v2
</span>
```

**Posição sugerida:** Entre o logo do Paddock e os botões de ação (Search, QR, Settings), para ser bem visível.

---

## Como Testar

Após a implementação:

1. `git pull`
2. `npm run build`
3. `npx cap sync`
4. No Xcode: Product → Clean Build Folder (⌘⇧K)
5. Deletar o app do iPhone
6. Build and Run

**Resultado esperado:**
- Se você VER "BUILD v2" em vermelho no topo do Profile → o bundle local está funcionando
- Se você NÃO VER "BUILD v2" → o app ainda está carregando de outra fonte (cache, servidor remoto, etc.)

---

## Próximos Passos (Após Confirmação)

- Se funcionar: removeremos o indicador e continuamos com os ajustes visuais
- Se não funcionar: investigaremos mais a fundo a configuração do Capacitor/Xcode

