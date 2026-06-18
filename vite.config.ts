import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [inspectAttr(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Separamos vendors pesados por dominio para que la carga inicial no
        // arrastre gráficos, 3D o exportación PDF si la ruta actual no los usa.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (
            id.includes('@react-three') ||
            id.includes('/three/') ||
            id.includes('/three-stdlib/')
          ) {
            return 'vendor-3d';
          }

          if (id.includes('@xyflow')) {
            return 'vendor-graph';
          }

          if (id.includes('recharts')) {
            return 'vendor-charts';
          }

          if (
            id.includes('jspdf') ||
            id.includes('html2canvas') ||
            id.includes('canvg')
          ) {
            return 'vendor-export';
          }

          if (id.includes('framer-motion') || id.includes('/gsap/')) {
            return 'vendor-motion';
          }

          if (
            id.includes('@radix-ui') ||
            id.includes('lucide-react') ||
            id.includes('cmdk') ||
            id.includes('/vaul/')
          ) {
            return 'vendor-ui';
          }

          if (
            id.includes('@tanstack/react-query') ||
            id.includes('axios') ||
            id.includes('react-router-dom')
          ) {
            return 'vendor-data';
          }
        },
      },
    },
  },
});
