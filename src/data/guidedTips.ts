// Guided tips data for onboarding users
// Each tip targets a specific element and provides contextual help

export interface GuidedTip {
  id: string;
  screen: string; // Which screen this tip belongs to
  targetSelector?: string; // CSS selector for the element to spotlight
  targetPosition?: "top" | "bottom" | "left" | "right" | "center"; // Position relative to target
  title: string;
  description: string;
  order: number; // Order within the screen
  action?: string; // Optional action text for the button
}

export const guidedTips: GuidedTip[] = [
  // Feed (Home) tips
  {
    id: "feed-welcome",
    screen: "feed",
    targetPosition: "center",
    title: "Bem-vindo ao Paddock! 🏎️",
    description: "Aqui você encontra posts da comunidade de colecionadores. Veja as miniaturas mais recentes e interaja com outros entusiastas.",
    order: 1,
    action: "Entendi!",
  },
  {
    id: "feed-scanner-nav",
    screen: "feed",
    targetSelector: "[data-tip='scanner-nav']",
    targetPosition: "top",
    title: "Scanner com IA",
    description: "Toque aqui para escanear suas miniaturas. Nossa IA identifica o modelo, conta a história do carro real e calcula o valor!",
    order: 2,
    action: "Próximo",
  },

  // Scanner tips
  {
    id: "scanner-capture",
    screen: "scanner",
    targetSelector: "[data-tip='capture-button']",
    targetPosition: "top",
    title: "Capture sua miniatura",
    description: "Toque para tirar foto ou segure por 0.5s para gravar vídeo de até 15 segundos. Múltiplos ângulos ajudam na identificação!",
    order: 1,
    action: "Entendi!",
  },
  {
    id: "scanner-flip",
    screen: "scanner",
    targetSelector: "[data-tip='flip-camera']",
    targetPosition: "left",
    title: "Trocar câmera",
    description: "Alterne entre câmera frontal e traseira para capturar de diferentes ângulos.",
    order: 2,
    action: "Próximo",
  },

  // Mercado (News) tips
  {
    id: "mercado-intro",
    screen: "mercado",
    targetPosition: "center",
    title: "Hub de Notícias 📰",
    description: "Fique por dentro das últimas novidades sobre colecionáveis, lançamentos e o mundo automotivo.",
    order: 1,
    action: "Legal!",
  },
  {
    id: "mercado-categories",
    screen: "mercado",
    targetSelector: "[data-tip='category-filter']",
    targetPosition: "bottom",
    title: "Filtre por categoria",
    description: "Escolha entre Colecionáveis, Motorsport, Carros e mais para personalizar seu feed.",
    order: 2,
    action: "Próximo",
  },

  // Profile tips
  {
    id: "profile-intro",
    screen: "profile",
    targetPosition: "center",
    title: "Seu Perfil 👤",
    description: "Aqui você gerencia sua coleção, vê suas estatísticas e compartilha com a comunidade.",
    order: 1,
    action: "Explorar!",
  },
  {
    id: "profile-tabs",
    screen: "profile",
    targetSelector: "[data-tip='profile-tabs']",
    targetPosition: "bottom",
    title: "Três visualizações",
    description: "Posts mostra suas fotos, BOX lista sua coleção com detalhes técnicos, e Índice ranqueia pelo valor.",
    order: 2,
    action: "Próximo",
  },
  {
    id: "profile-upload",
    screen: "profile",
    targetSelector: "[data-tip='scanner-nav']",
    targetPosition: "top",
    title: "Adicionar à coleção",
    description: "Use o Scanner para fotografar suas miniaturas e adicioná-las à sua coleção automaticamente!",
    order: 3,
    action: "Entendi!",
  },

  // Notifications tips
  {
    id: "notifications-intro",
    screen: "notifications",
    targetPosition: "center",
    title: "Suas Notificações 🔔",
    description: "Receba alertas sobre novos seguidores, curtidas nos seus posts e novidades da comunidade.",
    order: 1,
    action: "Entendi!",
  },

  // Collection item detail tips
  {
    id: "item-detail-score",
    screen: "item-detail",
    targetSelector: "[data-tip='price-index']",
    targetPosition: "bottom",
    title: "Índice de Valor",
    description: "Este número representa o valor estimado da sua miniatura baseado em raridade, condição e demanda do mercado.",
    order: 1,
    action: "Próximo",
  },
  {
    id: "item-detail-specs",
    screen: "item-detail",
    targetSelector: "[data-tip='item-specs']",
    targetPosition: "top",
    title: "Especificações",
    description: "Aqui estão todos os detalhes identificados pela IA: fabricante, série, escala, ano e condição.",
    order: 2,
    action: "Próximo",
  },
  {
    id: "item-detail-history",
    screen: "item-detail",
    targetSelector: "[data-tip='historical-fact']",
    targetPosition: "top",
    title: "Fato Histórico",
    description: "Descubra a história do carro real que inspirou sua miniatura. Curiosidades e marcos históricos!",
    order: 3,
    action: "Próximo",
  },
  {
    id: "item-detail-photos",
    screen: "item-detail",
    targetSelector: "[data-tip='real-car-photos']",
    targetPosition: "top",
    title: "Galeria do Carro Real",
    description: "Deslize para ver fotos reais do veículo: em ação, detalhes, versões clássicas e mais.",
    order: 4,
    action: "Incrível!",
  },
];

// Get tips for a specific screen
export const getTipsForScreen = (screen: string): GuidedTip[] => {
  return guidedTips
    .filter((tip) => tip.screen === screen)
    .sort((a, b) => a.order - b.order);
};

// Get all unique screens with tips
export const getScreensWithTips = (): string[] => {
  return [...new Set(guidedTips.map((tip) => tip.screen))];
};
