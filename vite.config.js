import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Vue 3 SPA. Dev server proxies /api and /share to the Laravel backend so the
// browser talks to a single origin during development.
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8001', changeOrigin: true },
      '/share': { target: 'http://localhost:8001', changeOrigin: true },
    },
  },
})
