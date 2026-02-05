import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.ec82142056a94147adde54a8d514aaac',
  appName: 'paddock-collectible-hub',
  webDir: 'dist',
  ios: {
    // Fundo transparente para permitir que camera-preview funcione com toBack:true
    // Isso força o Capacitor a configurar webView.isOpaque = false automaticamente
    backgroundColor: '#00000000',
  },
  // For development: enable hot reload from Lovable preview server
  // For production builds: comment out this server block
  server: {
    url: 'https://ec821420-56a9-4147-adde-54a8d514aaac.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
};

export default config;

