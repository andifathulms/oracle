import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base is set for GitHub Pages project-page hosting; override with BASE_PATH.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
