import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The React app calls the API at "/api/...". During development (and
// `vite preview`) Vite forwards those requests to the Express backend, so the
// browser sees a single origin and no CORS setup is needed for any dev port.
// Override the backend address with: API_PROXY_TARGET=http://localhost:5001 npm run dev
const apiProxy = {
  '/api': {
    target: process.env.API_PROXY_TARGET || 'http://localhost:5000',
    changeOrigin: true,
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
})
