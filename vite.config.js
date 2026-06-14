import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Vue 3 SPA. Dev server proxies /api to the Laravel backend.
// /share/* is a client-side route (ShareView) — do NOT proxy it; data loads via /api/share/:token.
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8001', changeOrigin: true },
    },
  },
})
