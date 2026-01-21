import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react()],
  root: './src/renderer',
  build: {
    outDir: '../../.vite/renderer/main_window',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
});
