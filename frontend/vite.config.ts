import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: {
    // Dans Docker, le backend est joignable sous le nom de son service (docker-compose.yml).
    proxy: {
      '/api': process.env.VITE_PROXY_API ?? 'http://localhost:3000',
    },
    watch: {
      usePolling: process.env.VITE_SCRUTER_FICHIERS === 'true',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
