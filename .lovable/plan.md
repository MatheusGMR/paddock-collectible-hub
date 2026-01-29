
# Plano de Implementação: Internacionalização, Busca Avançada, Imagens Reais e Fluxo de Postagem

## Resumo das Mudanças Solicitadas

1. **Internacionalização (i18n)** - Exibir conteúdo em Português ou Inglês baseado na localização do usuário
2. **Busca Avançada no Mercado** - Permitir busca por nome do carro ou ano nos repositórios reais
3. **Imagens Reais** - Usar apenas imagens dos anúncios reais, não placeholder genéricos
4. **Fluxo "Adicionar → Postar"** - Após adicionar item à coleção, oferecer opção de postar imediatamente

---

## 1. Sistema de Internacionalização (i18n)

### O que será feito
- Detectar o idioma do usuário automaticamente baseado no IP/localização do navegador
- Criar sistema de traduções para Português (PT-BR) e Inglês (EN)
- Traduzir todos os textos da interface dinamicamente

### Arquivos novos a criar
- `src/lib/i18n/index.ts` - Core do sistema de traduções
- `src/lib/i18n/translations/pt-BR.ts` - Traduções em Português
- `src/lib/i18n/translations/en.ts` - Traduções em Inglês
- `src/contexts/LanguageContext.tsx` - Context para gerenciar idioma globalmente
- `src/hooks/useTranslation.ts` - Hook para usar traduções nos componentes

### Arquivos a modificar
Todos os componentes com texto visível ao usuário serão atualizados para usar o hook `useTranslation()`:
- `src/components/scanner/ScannerView.tsx`
- `src/components/mercado/MercadoHeader.tsx`
- `src/components/mercado/SourceFilter.tsx`
- `src/components/mercado/ListingFeed.tsx`
- `src/components/feed/PostCard.tsx`
- `src/pages/Auth.tsx`
- `src/pages/Profile.tsx`
- Entre outros

### Como funcionará a detecção de idioma
```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Fluxo de Detecção de Idioma                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. App carrega                                                         │
│       ↓                                                                 │
│  2. Verifica localStorage (preferência salva)                           │
│       ↓                                                                 │
│  3. Se não existir, usa navigator.language                              │
│       ↓                                                                 │
│  4. Se começar com "pt" → Português                                     │
│     Senão → Inglês (padrão)                                             │
│       ↓                                                                 │
│  5. Usuário pode mudar manualmente (toggle no perfil)                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Busca Avançada no Mercado

### O que será feito
- Melhorar a barra de busca para aceitar nome do carro OU ano
- Enviar a query de busca para a API Firecrawl que já está configurada
- A busca será feita nos sites reais (eBay, Mercado Livre, OLX, etc.)

### Arquivos a modificar
- `src/components/mercado/MercadoHeader.tsx` - Melhorar placeholder e hints de busca
- `src/pages/Mercado.tsx` - Ajustar lógica de debounce e passagem de query
- `supabase/functions/fetch-listings/index.ts` - Já está configurado para receber query personalizada

### Comportamento atual vs. novo
| Aspecto | Atual | Novo |
|---------|-------|------|
| Placeholder | "Buscar no mercado..." | "Ex: Porsche 911, 1967, Skyline R34..." |
| Query padrão | "hot wheels diecast" | Query do usuário diretamente |
| Busca por ano | Não suportado | Sim, o ano é passado na query |

---

## 3. Imagens Reais dos Anúncios

### Problema identificado
O código atual usa imagens placeholder do Unsplash quando a API não retorna imagem:
```typescript
image_url: result.metadata?.ogImage || 
  "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=300&h=300&fit=crop"
```

### Solução
1. **Edge Function**: Não usar fallback genérico - se não tiver imagem real, não incluir o listing
2. **Mock Data**: Remover completamente quando houver dados reais disponíveis
3. **UI**: Mostrar indicador de "sem imagem" ao invés de imagem genérica (quando necessário manter listing)

### Arquivos a modificar
- `supabase/functions/fetch-listings/index.ts` - Filtrar listings sem imagem real ou marcar claramente
- `src/components/mercado/ListingCard.tsx` - Adicionar estado visual para "imagem indisponível"
- `src/data/mockListings.ts` - Marcar como dados de demonstração claramente ou remover quando não usado

### Nova lógica de filtragem
```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Processamento de Imagens                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Resultado do Firecrawl                                                 │
│       ↓                                                                 │
│  Tem ogImage ou imagem no metadata?                                     │
│       ↓                                                                 │
│  SIM → Usa imagem real                                                  │
│  NÃO → Descarta listing ou marca como "sem foto"                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Fluxo "Adicionar à Coleção → Postar"

### O que será feito
Após o usuário adicionar um item à coleção via Scanner, mostrar imediatamente a opção de criar um post para compartilhar na rede.

### Arquivos a modificar
- `src/components/scanner/ScannerView.tsx` - Adicionar botão "Postar" após sucesso de adicionar
- Criar: `src/components/posts/CreatePostDialog.tsx` - Modal para criar post com legenda

### Arquivos a criar
- `src/lib/api/posts.ts` - Funções para criar posts no banco de dados

### Novo fluxo de UX
```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Fluxo Atual                                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Scanner → Captura → Análise → Adicionar à Coleção → FIM                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  Novo Fluxo                                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Scanner → Captura → Análise → Adicionar à Coleção                      │
│                                            ↓                            │
│                                     Sucesso! ✅                         │
│                                            ↓                            │
│                            ┌───────────────────────────────┐            │
│                            │  Deseja compartilhar na rede? │            │
│                            │  [Postar Agora] [Mais Tarde]  │            │
│                            └───────────────────────────────┘            │
│                                            ↓                            │
│                               [Postar Agora] clicado                    │
│                                            ↓                            │
│                            ┌───────────────────────────────┐            │
│                            │  📷 [Imagem do item]          │            │
│                            │  ✏️ Escreva uma legenda...    │            │
│                            │  [Publicar]                   │            │
│                            └───────────────────────────────┘            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Mudança na UI do Scanner (após adicionar)
Os botões atuais:
- "Add to Collection" 
- "Scan Again"

Novos botões após sucesso:
- "Postar na Rede" (primário, destaque)
- "Escanear Outro" (secundário)

---

## Resumo Técnico

### Arquivos Novos (6 arquivos)
| Arquivo | Propósito |
|---------|-----------|
| `src/lib/i18n/index.ts` | Sistema de traduções |
| `src/lib/i18n/translations/pt-BR.ts` | Textos em Português |
| `src/lib/i18n/translations/en.ts` | Textos em Inglês |
| `src/contexts/LanguageContext.tsx` | Context global de idioma |
| `src/hooks/useTranslation.ts` | Hook para usar traduções |
| `src/components/posts/CreatePostDialog.tsx` | Modal de criação de post |
| `src/lib/api/posts.ts` | API para criar posts |

### Arquivos Modificados (8+ arquivos)
| Arquivo | Tipo de Mudança |
|---------|-----------------|
| `supabase/functions/fetch-listings/index.ts` | Filtrar listings sem imagem real |
| `src/components/scanner/ScannerView.tsx` | Adicionar fluxo de postar + traduções |
| `src/components/mercado/MercadoHeader.tsx` | Melhorar busca + traduções |
| `src/components/mercado/ListingCard.tsx` | Estado "sem imagem" |
| `src/pages/Mercado.tsx` | Lógica de busca avançada |
| `src/App.tsx` | Wrap com LanguageProvider |
| Múltiplos componentes | Aplicar `useTranslation()` |

### Priorização Sugerida
1. **Sistema i18n** (base para traduções)
2. **Fluxo Postar após Adicionar** (melhoria de UX direta)
3. **Busca Avançada** (já funcional, melhorias pontuais)
4. **Imagens Reais** (depende do retorno da API Firecrawl)

