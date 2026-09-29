import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Dockerコンテナ内では http://backend:8000、ローカル直下では http://127.0.0.1:8000
  const target = env.VITE_API_TARGET || process.env.VITE_API_TARGET || 'http://127.0.0.1:8000'

  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: true,
      proxy: {
        '/api': {
          target: target,
          changeOrigin: true,
        },
        '/static': {
          target: target,
          changeOrigin: true,
        }
      }
    }
  }
})
