import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/queue_job': 'http://127.0.0.1:5000',
      '/queue_audio': 'http://127.0.0.1:5000',
      '/queue_quest': 'http://127.0.0.1:5000',
      '/library': 'http://127.0.0.1:5000',
      '/delete': 'http://127.0.0.1:5000',
      '/game-assets': 'http://127.0.0.1:5000',
      '/status': 'http://127.0.0.1:5000',
      '/clear_history': 'http://127.0.0.1:5000',
      '/api': 'http://127.0.0.1:5000'
    }
  }
})
