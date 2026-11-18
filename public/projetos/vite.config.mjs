import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const diretorio = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: diretorio,
  base: '/projetos/dist/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
