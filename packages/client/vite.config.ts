import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // allow connections
    proxy: {
      '/api': {
        target: 'http://server:3000', // for development, proxy API requests to the server container
        changeOrigin: true
      }
    }
  }
});
