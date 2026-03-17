

## Problema: Conflito de Plugins Duplicados de Camera Preview

O log do terminal mostra claramente o erro crítico:

```
Class CameraPreview is implemented in both
  CapgoCameraPreview.framework AND CapacitorCommunityCameraPreview.framework
```

O `package.json` tem **dois** plugins de câmera instalados:
- `@capacitor-community/camera-preview` (v7) — o antigo
- `@capgo/camera-preview` (v8) — o que o projeto usa de fato

Ambos registram a mesma classe nativa `CameraPreview`, causando o conflito. Os demais erros (constraints, sandbox, CoreMotion) são avisos padrão do iOS e não afetam a funcionalidade.

---

## Plano

### 1. Remover o plugin duplicado do `package.json`

Remover `@capacitor-community/camera-preview` das dependências, mantendo apenas `@capgo/camera-preview` que é o utilizado no código (`useNativeCameraPreview.ts`).

### 2. Instruções pós-merge para o usuário

Após o git pull:
```bash
rm -rf node_modules ios/App/Pods
npm install
npx cap sync ios
npx cap run ios
```

Isso garante que o framework duplicado `CapacitorCommunityCameraPreview.framework` seja removido do build nativo.

---

**Nota técnica**: Os warnings de `UIScene lifecycle`, `Unable to simultaneously satisfy constraints` e `variant selector cell index` são mensagens internas do iOS/WebKit e não indicam problemas no app.

