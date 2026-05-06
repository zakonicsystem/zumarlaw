import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    proxy: {
      '/manualService': 'http://localhost:5000',
      '/convertedService': 'http://localhost:5000',
      '/processing': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
      '/accounts': 'http://localhost:5000',
      '/autoSalary': 'http://localhost:5000',
    },
  },
})
