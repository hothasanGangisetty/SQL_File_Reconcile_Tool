import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // During 'npm run dev', proxy API calls to Flask backend
    proxy: {
      '/api': 'http://localhost:5000'
    }
  },
  build: {
    // Output goes to frontend/dist/ (default)
    outDir: 'dist',
    emptyOutDir: true
  }
})