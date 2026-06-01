import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/admin/',
  logLevel: 'error',
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      onwarn(warning, warn) {
        // 精准屏蔽 INVALID_ANNOTATION
        if (warning.message.includes('[INVALID_ANNOTATION]')) return
        // 其他警告正常输出
        warn(warning)
      }
    }
  },
  server: {
    port: 3003,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/static': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/upload': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
