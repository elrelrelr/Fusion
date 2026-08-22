import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { fileURLToPath } from 'node:url'

// Una sola copia de `buffer` en todo el bundle: GramJS comprueba
// `data instanceof Buffer` y con dos copias distintas la comprobación falla
// ("Bytes or str expected, not Buffer") al iniciar sesión.
const bufferPath = fileURLToPath(new URL('./node_modules/buffer/index.js', import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util', 'process', 'events', 'path', 'os', 'zlib'],
      // Buffer NO se inyecta por módulo: lo fijamos una sola vez en main.jsx
      // para que exista una única clase Buffer en toda la app.
      globals: { Buffer: false, global: true, process: true },
    }),
  ],
  resolve: {
    dedupe: ['buffer'],
    alias: [
      { find: /^buffer$/, replacement: bufferPath },
      { find: /^buffer\/$/, replacement: bufferPath },
      { find: /^node:buffer$/, replacement: bufferPath },
    ],
  },
  define: { 'process.env': {} },
  build: { target: 'es2020', chunkSizeWarningLimit: 4000 },
  server: { host: '0.0.0.0', port: 5173, strictPort: true, allowedHosts: true, cors: true, hmr: { clientPort: 443 } },
  preview: { host: '0.0.0.0', port: 5173, allowedHosts: true },
})
