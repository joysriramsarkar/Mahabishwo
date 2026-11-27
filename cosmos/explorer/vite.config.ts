import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/// <reference types="vitest" />

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          arrow: ['apache-arrow'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-slider', 'framer-motion'],
        },
      },
    },
  },
});
