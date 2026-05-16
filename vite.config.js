import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
      }
    }
  }
})
