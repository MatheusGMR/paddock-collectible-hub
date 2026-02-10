import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.ec82142056a94147adde54a8d514aaac',
  appName: 'paddock-collectible-hub',
  webDir: 'dist',
  ios: {
    // Fundo opaco padrão para evitar tela branca/transparente
    // A transparência para camera-preview é aplicada dinamicamente via JS apenas no Scanner
    backgroundColor: '#0E1117',
  },
  // Nota: NÃO usar CapacitorHttp - causa incompatibilidade com Supabase SDK
  // O WKWebView moderno (iOS 14+) suporta fetch() nativamente sem problemas
  // For development: uncomment the server block to enable hot reload
  // For production builds: keep this commented out
  // server: {
  //   url: 'https://ec821420-56a9-4147-adde-54a8d514aaac.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
};

export default config;

