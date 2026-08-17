import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 4096, // Inline small assets < 4KB
    rollupOptions: {
      output: {
        manualChunks: {
          // Code-split Three.js into its own chunk
          three: ['three'],
        },
      },
    },
    minify: 'esbuild',
    cssMinify: true,
  },
  server: {
    port: 3000,
    open: true,
  },
});
