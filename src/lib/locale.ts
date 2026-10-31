// Language lives in the URL: /ar/... is Arabic, everything else English. Search engines get one
// stable URL per language; the router runs with basename "/ar" so in-app links stay in Arabic.
export const AR_URL = typeof window !== 'undefined' && /^\/ar(\/|$)/.test(window.location.pathname);
export const BASENAME = AR_URL ? '/ar' : undefined;

/** Path in the other language, keeping query and hash. */
export function counterpartUrl(loc: Location = window.location): string {
  const path = AR_URL ? (loc.pathname.replace(/^\/ar(?=\/|$)/, '') || '/') : `/ar${loc.pathname === '/' ? '/' : loc.pathname}`;
  return path + loc.search + loc.hash;
}

/** Public URL of a route in the current language (route paths are written without /ar). */
export const localized = (path: string) => (AR_URL ? `/ar${path === '/' ? '/' : path}` : path);
