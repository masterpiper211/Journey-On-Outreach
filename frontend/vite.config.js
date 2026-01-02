import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',
  server: {
    proxy: {
      // Forward API requests to backend running on port 3000 during development
      '/encounters': 'http://localhost:3000',
      '/health': 'http://localhost:3000'
    }
  }
})
