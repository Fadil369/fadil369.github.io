// Per-page social/SEO meta handler for the BrainSAIT SPA.
// Lives behind the GitHub Pages client-side fallback, so a JS-less crawler
// only sees the static head (see src/index.html). This module keeps title +
// Open Graph + Twitter Card + canonical in sync once the app has rendered so
// deep routes (products, sections) unfurl with the correct title/description/
// image when shared, and in-app document.title is accurate.

export const ORIGIN = 'https://fadil369.github.io';

export interface PageMeta {
  title: string;
  description: string;
  /** Relative (start with /) or absolute URL. Absolutised before setting. */
  image?: string | null;
  /** Canonical/og:url. Relative path (e.g. `/products/build-ticket`). */
  url?: string;
  type?: string;
}

function absolutize(p: string | null | undefined): string {
  if (!p) return '';
  if (/^https?:\/\//.test(p)) return p;
  if (p.startsWith('/')) return ORIGIN + p;
  return ORIGIN + '/' + p;
}

function setOrCreate(attr: 'name' | 'property', key: string, content: string) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  if (!href) return;
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** Update document.title + OG/Twitter/canonical for the current page. */
export function applyPageMeta(meta: PageMeta) {
  try {
    const url = absolutize(meta.url ?? '/');
    const image = absolutize(meta.image);
    const type = meta.type ?? 'website';

    document.title = meta.title;

    setOrCreate('property', 'og:title', meta.title);
    setOrCreate('property', 'og:description', meta.description);
    setOrCreate('property', 'og:image', image);
    setOrCreate('property', 'og:url', url);
    setOrCreate('property', 'og:type', type);

    setOrCreate('name', 'twitter:title', meta.title);
    setOrCreate('name', 'twitter:description', meta.description);
    setOrCreate('name', 'twitter:image', image);

    // Keep canonical in sync with the rendered route.
    setCanonical(url);
  } catch {
    /* never break the UI over meta */
  }
}
