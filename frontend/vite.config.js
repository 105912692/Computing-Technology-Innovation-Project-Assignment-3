import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // the back end's CORS setting (FRONTEND_ORIGIN) expects exactly this port
    proxy: {
      // In development, /api/* is forwarded to FastAPI, so the browser only talks to localhost:5173
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
})
