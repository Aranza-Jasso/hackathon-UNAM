import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// base './' para que el build funcione desde cualquier ruta.
// En desarrollo, Vite reenvía /api a Uvicorn (puerto 8000).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8000' } },
  build: {
    rollupOptions: {
      // React y Recharts en archivos aparte: cambian poco, así el navegador los conserva en caché.
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          return 'graficas' // Recharts y sus dependencias (d3, redux, etc.)
        },
      },
    },
  },
})
