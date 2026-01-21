import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Web-only Vite config (for development without Electron)
// Use `npm run web:dev` to run in web mode
// Use `npm run dev` to run with Electron
export default defineConfig({
  root: './src/renderer',
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  plugins: [react()],
  build: {
    outDir: '../../dist-web',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
    },
  },
  css: {
    postcss: path.resolve(__dirname, './postcss.config.js'),
  },
});
