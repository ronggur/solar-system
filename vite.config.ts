import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { inspectAttr } from 'kimi-plugin-inspect-react';

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: '/solar-system/',
  // inspectAttr injects code-path debug attributes into every element;
  // keep it for dev inspection only, out of production builds.
  plugins: [...(command === 'serve' ? [inspectAttr()] : []), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](three|three-stdlib|@react-three)[\\/]/.test(id)) {
            return 'vendor-three';
          }
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
            return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
}));
