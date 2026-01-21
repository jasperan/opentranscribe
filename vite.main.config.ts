import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron', 'electron-updater'],
    },
  },
  resolve: {
    // Load the Node.js entry.
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
});
