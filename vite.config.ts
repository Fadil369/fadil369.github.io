import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Deployed at the domain root (fadil369.github.io), so base = '/'.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
});
