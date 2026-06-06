import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split heavy dependencies into separate chunks for better caching
        // and faster initial load. Three.js is ~1MB on its own.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'zustand'],
          'three': ['three', '@react-three/fiber', '@react-three/drei'],
          'flow': ['@xyflow/react'],
          'mosaic': ['react-mosaic-component'],
          'icons': ['lucide-react'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
