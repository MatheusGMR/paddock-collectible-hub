
# Plano: Reprodução de Música via YouTube Embed no App

## Objetivo
Permitir que o usuário ouça a música sugerida diretamente no app, sem ser redirecionado para aplicativos externos, usando YouTube embed com workaround para iOS.

---

## O Problema no iOS/Capacitor

O YouTube embed tradicional (`youtube-nocookie.com`) gera **Error 153** em apps iOS/Android baseados em WebView (como Capacitor). Isso acontece porque:
- O YouTube bloqueia embeds quando o `origin` não é um domínio HTTP válido
- Capacitor usa `capacitor://localhost` que o YouTube não reconhece

---

## Solução: Proxy HTML Local

A solução recomendada é criar uma página HTML de relay que:
1. É hospedada no próprio app (na pasta `public/`)
2. Carrega o iframe do YouTube com os parâmetros corretos
3. O WebView carrega essa página local, que então carrega o YouTube

```text
┌─────────────────────────────────────────────────────┐
│                    MusicPlayer                      │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │          /youtube-embed.html?v=XXX          │   │
│  │                    ↓                        │   │
│  │   iframe → youtube-nocookie.com/embed/XXX   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Etapas de Implementação

### Etapa 1: Criar Edge Function para Buscar Vídeos no YouTube

**Arquivo:** `supabase/functions/youtube-search/index.ts`

Esta função irá:
- Receber `title` e `artist` da música
- Usar a YouTube Data API v3 para buscar o vídeo mais relevante
- Retornar o `videoId` do YouTube

**Requer:** `YOUTUBE_API_KEY` (chave gratuita do Google Cloud Console)

### Etapa 2: Criar Página de Relay HTML

**Arquivo:** `public/youtube-embed.html`

Uma página HTML simples que:
- Recebe o `videoId` via query parameter (`?v=XXX`)
- Cria um iframe apontando para `youtube-nocookie.com`
- Define `origin` como o domínio local
- Configura opções de playback inline (importante para iOS)

### Etapa 3: Atualizar MusicPlayer.tsx

**Arquivo:** `src/components/scanner/MusicPlayer.tsx`

Modificações:
- Adicionar estado para `youtubeVideoId` e `isPlaying`
- Ao clicar em Play, chamar a edge function para buscar o vídeo
- Renderizar iframe apontando para `/youtube-embed.html?v={videoId}`
- Manter botões de fallback para abrir no Spotify/YouTube Music

### Etapa 4: Atualizar analyze-collectible para Retornar YouTube ID (Opcional)

Se quisermos evitar a latência de busca ao clicar no play, podemos:
- Durante a análise do colecionável, já buscar o YouTube video ID
- Salvar junto com `music_suggestion`
- Isso elimina a espera ao clicar em play

---

## Detalhes Técnicos

### Edge Function: youtube-search

```typescript
// Pseudocódigo
const searchYouTube = async (title: string, artist: string) => {
  const query = `${title} ${artist} official audio`;
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?` +
    `part=snippet&type=video&q=${query}&key=${YOUTUBE_API_KEY}&maxResults=1`
  );
  const data = await response.json();
  return data.items[0]?.id?.videoId || null;
};
```

### Página de Relay (youtube-embed.html)

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: #000; height: 100vh; }
    iframe { width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <iframe id="player" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  <script>
    const params = new URLSearchParams(location.search);
    const videoId = params.get('v');
    if (videoId) {
      document.getElementById('player').src = 
        `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1`;
    }
  </script>
</body>
</html>
```

### Interface do Player Atualizada

| Estado | Visual |
|--------|--------|
| Inicial | Botão Play + info da música |
| Carregando | Spinner + "Buscando música..." |
| Tocando | Iframe do YouTube + controles |
| Erro | Mensagem + botões de fallback |

---

## Configuração Necessária

### YouTube Data API Key

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione existente
3. Ative a "YouTube Data API v3"
4. Crie uma API Key em "Credentials"
5. (Opcional) Restrinja a key ao seu domínio

**Custo:** Gratuito - YouTube Data API oferece 10.000 unidades/dia grátis (1 busca = 100 unidades = ~100 buscas/dia)

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/youtube-search/index.ts` | Criar novo |
| `public/youtube-embed.html` | Criar novo |
| `src/components/scanner/MusicPlayer.tsx` | Modificar |

---

## Fluxo do Usuário

1. Usuário escaneia colecionável
2. Card de resultados aparece com player de música
3. Usuário clica no botão Play
4. Sistema busca vídeo no YouTube (1-2s)
5. Player embed aparece e música começa
6. Se falhar, botões de fallback para Spotify/YouTube Music

---

## Próximo Passo

Para implementar, você precisará fornecer a **YouTube API Key** do Google Cloud Console. A configuração é simples e gratuita.

Deseja que eu prossiga com a implementação?
