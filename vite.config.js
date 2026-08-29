import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      jspdf: fileURLToPath(new URL('./node_modules/jspdf/dist/jspdf.es.min.js', import.meta.url)),
      'jspdf-autotable': fileURLToPath(new URL('./node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.mjs', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/uploads': 'http://127.0.0.1:3001',
    },
  },
})
