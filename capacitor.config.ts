import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.paddockonline.app',
  appName: 'Paddock',
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

