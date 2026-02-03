
# Plano: Aprimorar Splash Screen Mobile com Efeito Premium

## Objetivo
Replicar o efeito visual premium do preview web na splash screen móvel, adicionando um acabamento de fundo elegante com gradientes e brilho difuso atrás do logo.

---

## Situação Atual

O `SplashScreen.tsx` atualmente possui:
- Fundo sólido `#0E1117` (preto-azulado)
- Logo Paddock centralizado com sombra sutil (`drop-shadow`)
- Barra de progresso animada na parte inferior

**O que falta:** O efeito de "glow" premium - gradientes radiais suaves que criam profundidade e sofisticação visual.

---

## Alterações Propostas

### 1. Adicionar Gradientes de Fundo Premium

Criar camadas de gradiente radial que emanam do centro (atrás do logo):

```text
┌─────────────────────────────────┐
│                                 │
│     ░░░░░░░░░░░░░░░░░░░░░      │
│   ░░░░░▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░   │
│  ░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░  │
│ ░░░░▓▓▓▓▓▓▓███▓▓▓▓▓▓▓░░░░░░░░░ │
│ ░░░░▓▓▓▓▓▓█LOGO█▓▓▓▓▓░░░░░░░░░ │
│ ░░░░▓▓▓▓▓▓▓███▓▓▓▓▓▓▓░░░░░░░░░ │
│  ░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░  │
│   ░░░░░▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░   │
│     ░░░░░░░░░░░░░░░░░░░░░      │
│                                 │
│           [═══════]             │
└─────────────────────────────────┘
    ░ = gradiente externo suave
    ▓ = gradiente interno (glow azul)
```

### 2. Estrutura de Camadas

**Camada 1 - Base:** Fundo sólido `#0E1117`

**Camada 2 - Gradiente Principal:** Radial gradient azul ciano emanando do centro
- Cor: `rgba(76, 195, 255, 0.15)` → transparente
- Tamanho: ~60% da tela

**Camada 3 - Gradiente Secundário:** Toque de azul escuro/roxo para profundidade
- Cor: `rgba(30, 64, 175, 0.08)` → transparente  
- Posição: ligeiramente deslocado para baixo

**Camada 4 - Logo:** Com drop-shadow intensificado

### 3. Animação Sutil (Opcional)

Adicionar animação de "respiração" no glow principal:
- Opacidade oscila suavemente entre 0.1 e 0.2
- Transição de 3-4 segundos
- Cria sensação de "vivo" e premium

---

## Arquivo a Modificar

`src/components/SplashScreen.tsx`

---

## Detalhes Técnicos

### Código dos Gradientes

```css
/* Gradiente principal - glow azul ciano */
background: radial-gradient(
  ellipse 50% 50% at 50% 45%,
  rgba(76, 195, 255, 0.12) 0%,
  rgba(76, 195, 255, 0.04) 40%,
  transparent 70%
);

/* Gradiente secundário - profundidade azul escuro */
background: radial-gradient(
  ellipse 70% 60% at 50% 55%,
  rgba(30, 64, 175, 0.08) 0%,
  transparent 60%
);
```

### Animação de Pulso

```css
@keyframes glow-pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}
```

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Fundo plano e sólido | Fundo com profundidade e brilho |
| Logo com sombra sutil | Logo com halo de luz difusa |
| Visual básico | Visual premium alinhado com a identidade Paddock |

---

## Compatibilidade

- ✅ Funciona em iOS (Capacitor)
- ✅ Funciona em Android (Capacitor)  
- ✅ Funciona no preview web
- ✅ Transição suave para a Launch Screen nativa do Xcode (ambas têm fundo escuro similar)
