// The one source for the app's own description of itself.
//
// There used to be three: a hand-written <meta name="description"> in
// index.html, the masthead subtitle, and the overture's opening paragraph. The
// meta description had already drifted from both, which is worse than having
// none — a search result or a shared card that promises something the page does
// not say.
//
// So the page renders these strings and the build injects the same ones into
// the document head. Change the copy here and both move together.
export const SITE = {
  name: 'Oracle',

  // The masthead subtitle, and the second half of the document title.
  tagline: 'Recover a message from one bit of feedback',

  // The overture's opening paragraph, and the meta/OG description verbatim.
  description:
    'A server that reveals only whether a message’s padding is valid leaks enough to rebuild ' +
    'the entire message. This runs that attack live, and never hands the screen the key or the ' +
    'plaintext.',

  // Where the built site lives. Used for the canonical link and og:url, both of
  // which need an absolute URL that a relative base path cannot supply.
  url: 'https://andifathulms.github.io/oracle/',
} as const;

// The separator is the middle dot the colophon already uses, not an em-dash.
// The title is visible copy — it is the browser tab, the search result and the
// share card — and the em-dash sweep only covered .tsx, so index.html kept one.
export const DOC_TITLE = `${SITE.name} · ${SITE.tagline.toLowerCase()}`;
