import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // Permite acesso da rede local
    proxy: {
      '/upload': {
        target: 'https://leitorback-2.onrender.com',
        changeOrigin: true
      },
      '/processar_contratos': {
        target: 'https://leitorback-2.onrender.com',
        changeOrigin: true
      },
      '/health': {
        target: 'https://leitorback-2.onrender.com',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
