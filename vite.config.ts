/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base is set for GitHub Pages project-page hosting; override with BASE_PATH.
export default defineConfig(({ mode }) => ({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  // Force production React for real builds regardless of ambient NODE_ENV
  // (vitest sets NODE_ENV=test, which would otherwise bundle dev React whose
  // warning strings mention fetch and trip the no-network guard). Not applied
  // under Vitest itself, where dev React is needed for act().
  ...(mode === 'test' || process.env.VITEST
    ? {}
    : { define: { 'process.env.NODE_ENV': JSON.stringify('production') } }),
  build: {
    target: 'es2020',
    sourcemap: false,
    // No module-preload polyfill: it injects a fetch() call, and the bundle
    // must contain no network APIs at all (PRD §7.1).
    modulePreload: { polyfill: false },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
}));
