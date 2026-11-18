import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Subsistema Cliente Web: uma aplicacao React so, compilada em public/dist.
// O servidor Express serve essa pasta (ver src/main.ts).
//
//   npm run build:cliente   compila para public/dist
//   npm run dev:cliente     servidor do Vite com recarga automatica em
//                           http://localhost:5173; as chamadas /api vao para
//                           o servidor da aplicacao na porta 3000

const diretorio = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: diretorio,
  base: '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
});
