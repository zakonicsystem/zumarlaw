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
      '/manualService': 'https://app.zumarlawfirm.com',
      '/convertedService': 'https://app.zumarlawfirm.com',
      '/processing': 'https://app.zumarlawfirm.com', // <-- add this line
      '/uploads': 'https://app.zumarlawfirm.com',
      '/accounts': 'https://app.zumarlawfirm.com',
      '/autoSalary': 'http://localhost:5000',
    },
  },
})
