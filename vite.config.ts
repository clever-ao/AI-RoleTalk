import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      // API 请求代理到后端（保留 /api 前缀）
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // 不再去除 /api 前缀，因为后端路由就是 /api/xxx 格式
      },
    },
  },
})
