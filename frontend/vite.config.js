import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
// Set BASE_URL env var to '/your-repo-name/' when deploying to GitHub Pages
// under a project subpath. For user/org pages (username.github.io) leave '/'.
export default defineConfig({
  base: process.env.BASE_URL || '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    hmr: {
      // Tunnel HMR through Emergent's HTTPS proxy when running in the cloud preview.
      clientPort: 443,
      protocol: 'wss',
    },
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
