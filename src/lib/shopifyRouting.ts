/**
 * Seamless Shopify routing — preserves UTM, adds gh.io attribution,
 * and handles bilingual + external link best practices.
 * All store.brainsait.de links should go through these helpers so
 * the two stores stay synced and analytics stay clean.
 */

const STORE_BASE = 'https://store.brainsait.de';

export function withUtm(url: string, extra: Record<string, string> = {}): string {
  try {
    const u = new URL(url, STORE_BASE);
    const params = new URLSearchParams(u.search);
    // preserve existing UTM from current page
    try {
      const cur = new URLSearchParams(window.location.search);
      for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
        if (cur.has(k) && !params.has(k)) params.set(k, cur.get(k)!);
      }
    } catch {}
    // gh.io attribution (don't override if already set)
    if (!params.has('utm_source')) params.set('utm_source', 'ghio');
    if (!params.has('utm_medium')) params.set('utm_medium', 'referral');
    for (const [k, v] of Object.entries(extra)) if (!params.has(k)) params.set(k, v);
    u.search = params.toString();
    return u.toString();
  } catch {
    return url;
  }
}

export function openShopify(url: string, extra?: Record<string, string>) {
  const href = withUtm(url, extra);
  window.open(href, '_blank', 'noopener,noreferrer');
}

export const GHIO_LINKS = {
  learnMonthly: `${STORE_BASE}/products/learn-brainsait-digital-access`,
  learnBooks: `${STORE_BASE}/collections/learn-books`,
  buildMonthly: `${STORE_BASE}/products/build-forge-incubator-founders-program`,
  buildTicket: `${STORE_BASE}/products/build-ticket`,
  bpr: `${STORE_BASE}/products/provider-registry`,
  solutionReady: `${STORE_BASE}/collections/solutions-ready`,
  solutionReadyProduct: `${STORE_BASE}/products/solutions-ready-enterprise-deployment`,
  solutionMonthly: `${STORE_BASE}/products/solutions-brainsait-super-partner-program`,
  benefits: `${STORE_BASE}/pages/benefits`,
};
