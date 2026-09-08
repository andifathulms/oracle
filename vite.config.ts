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
function oracleMeta(): Plugin {
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
        `<meta name="twitter:card" content="summary" />`,
        `<meta name="twitter:title" content="${esc(DOC_TITLE)}" />`,
        `<meta name="twitter:description" content="${esc(SITE.description)}" />`,
        `<meta name="theme-color" content="#0f1218" />`,
        // A void cell resolving to gold: the app's mark, inline, so the tab
        // icon costs no request. The favicon.ico probe was a measured 404.
        `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
            '<rect width="32" height="32" rx="6" fill="#0a0d12"/>' +
            '<rect x="7" y="7" width="18" height="18" rx="3" fill="#c8a24a"/>' +
            '</svg>',
        )}" />`,
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
  plugins: [react(), oracleMeta()],
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
