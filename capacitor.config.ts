import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.ec82142056a94147adde54a8d514aaac',
  appName: 'paddock-collectible-hub',
  webDir: 'dist',
  ios: {
    // Transparente para permitir camera-preview no Scanner
    backgroundColor: '#00000000',
  },
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  // Nota: NÃO usar CapacitorHttp - causa incompatibilidade com Supabase SDK
};

export default config;

