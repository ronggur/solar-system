import path from 'path';
import { defineConfig } from 'vitest/config';

// Standalone config (not merged with vite.config.ts) so tests never load the dev-only
// `inspectAttr` plugin or the production chunking rules. Tests run in plain Node.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
