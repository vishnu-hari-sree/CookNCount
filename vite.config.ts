// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    proxy: {
      // Proxy requests from /api to your backend server
      '/api': {
        target: 'https://cookncount.onrender.com/', // Your backend server URL
        changeOrigin: true,
      },
    },
  },
})