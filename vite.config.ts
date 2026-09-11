/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { SITE, DOC_TITLE } from './src/meta';

const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Document head and no-script summary, generated from the same strings the page
// renders (src/meta.ts). Hand-maintained metadata drifts from the page it
// describes; this cannot.
//
// No og:image: the app ships no raster images at all and there is nothing to
// point at. A card with a title, a description and a site name is still far
// better than the bare <title> fallback that shipped before, and inventing an
// image would mean adding a build dependency to generate one.
function oracleMeta(base: string): Plugin {
  // Assets live in public/ and are served from the deploy's base path, which is
  // "/" locally and "/oracle/" on GitHub Pages.
  const asset = (f: string) => `${base}${f}`;
  // og:image must be absolute: crawlers do not resolve it against the page.
  const absolute = (f: string) => new URL(f, SITE.url).href;

  return {
    name: 'oracle-meta',
    transformIndexHtml(html) {
      const head = [
        `<title>${esc(DOC_TITLE)}</title>`,
        `<meta name="description" content="${esc(SITE.description)}" />`,
        `<link rel="canonical" href="${esc(SITE.url)}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:site_name" content="${esc(SITE.name)}" />`,
        `<meta property="og:title" content="${esc(DOC_TITLE)}" />`,
        `<meta property="og:description" content="${esc(SITE.description)}" />`,
        `<meta property="og:url" content="${esc(SITE.url)}" />`,
        `<meta property="og:image" content="${esc(absolute('og.png'))}" />`,
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        `<meta property="og:image:alt" content="${esc(
          'The Oracle mark: a block of ciphertext mid-attack, its recovered bytes in gold.',
        )}" />`,
        // summary_large_image, now that there is an image worth showing.
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:image" content="${esc(absolute('og.png'))}" />`,
        `<meta name="twitter:title" content="${esc(DOC_TITLE)}" />`,
        `<meta name="twitter:description" content="${esc(SITE.description)}" />`,
        `<meta name="theme-color" content="#0f1218" />`,
        // The real mark, replacing the hand-drawn data URI that stood in for
        // it. SVG first for anything modern; the 32 PNG is the fallback.
        `<link rel="icon" type="image/svg+xml" href="${esc(asset('favicon.svg'))}" />`,
        `<link rel="icon" type="image/png" sizes="32x32" href="${esc(asset('icon-32.png'))}" />`,
        `<link rel="apple-touch-icon" sizes="180x180" href="${esc(asset('apple-touch-icon.png'))}" />`,
        `<link rel="manifest" href="${esc(asset('site.webmanifest'))}" />`,
      ].join('\n    ');

      // Crawlers and social bots do not execute JavaScript, and the served body
      // is a single empty div. This gives them the page's own words rather than
      // nothing. It is inside <noscript>, so a reader with JavaScript never
      // sees it and there is no flash of static content before React mounts.
      const noscript =
        `<noscript><h1>${esc(SITE.name)}</h1><p>${esc(SITE.tagline)}.</p>` +
        `<p>${esc(SITE.description)}</p>` +
        `<p>This is an interactive demonstration and needs JavaScript. Nothing is sent anywhere: ` +
        `the app has no network code at all.</p></noscript>`;

      return html
        .replace('<!--%ORACLE_META%-->', head)
        .replace('<!--%ORACLE_NOSCRIPT%-->', noscript);
    },
  };
}

// base is set for GitHub Pages project-page hosting; override with BASE_PATH.
export default defineConfig(({ mode }) => ({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), oracleMeta(process.env.BASE_PATH ?? '/')],
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
