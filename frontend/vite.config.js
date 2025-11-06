import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.cjs'
  },
  server: {
    port: 5173,
    open: true
  },
  optimizeDeps: {
    include: ['@stellar/stellar-sdk'],
  },
  build: {
    commonjsOptions: {
      include: [/@stellar\/stellar-sdk/, /node_modules/],
    },
  }
});