import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { componentTagger } from "lovable-tagger";

// Generate a unique build ID based on timestamp
const WEB_BUILD_ID = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

export default defineConfig(({ mode }) => ({
  base: './',
  define: {
    __WEB_BUILD_ID__: JSON.stringify(WEB_BUILD_ID),
  },
  server: {
    host: '::',
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}))
