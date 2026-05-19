import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
            return 'vendor-core';
          }
        }
      }
    }
  },
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://152.53.55.180:5504',
        changeOrigin: true,
        secure: false,
      },
      '/docs': {
        target: 'http://152.53.55.180:5504',
        changeOrigin: true,
        secure: false,
      },
      '/openapi.json': {
        target: 'http://152.53.55.180:5504',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://152.53.55.180:5504',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
