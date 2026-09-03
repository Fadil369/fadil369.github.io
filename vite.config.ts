import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Deployed at the domain root (fadil369.github.io), so base = '/'.
// Source HTML lives at src/index.html so the publish step (which copies the
// built index.html back to the repo root) never clobbers the build entry.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      input: `${import.meta.dirname}/src/index.html`,
    },
    chunkSizeWarningLimit: 600,
  },
});
