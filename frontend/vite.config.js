import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const backendUrl = 'http://localhost:3002';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { '/api': backendUrl },
  },
  preview: {
    proxy: { '/api': backendUrl },
  },
})
