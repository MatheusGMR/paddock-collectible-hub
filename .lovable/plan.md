
## Remoção do Indicador BUILD v2

Agora que confirmamos que o bundle local está carregando corretamente no app nativo, vou remover o indicador de debug "BUILD v2" do header do Profile.

---

## Alteração

**Arquivo:** `src/components/profile/ProfileHeader.tsx`

Remover o elemento `<span>` nas linhas 44-46 que exibe o badge "BUILD v2":

```tsx
// REMOVER estas linhas:
<span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded">
  BUILD v2
</span>
```

O header voltará a exibir apenas o logo Paddock, sem indicadores de debug.

---

## Detalhes Tecnicos

- Alteracao simples de 3 linhas removidas
- Nenhuma dependencia afetada
- O layout do header permanece intacto, apenas o badge vermelho sera removido
