import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://luna.ender.co.in:5504',
        changeOrigin: true,
        secure: false,
      },
      '/docs': {
        target: 'http://luna.ender.co.in:5504',
        changeOrigin: true,
        secure: false,
      },
      '/openapi.json': {
        target: 'http://luna.ender.co.in:5504',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
