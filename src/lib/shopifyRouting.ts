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
  // Monthly subscriptions (auto-renewing)
  learnMonthly: `${STORE_BASE}/products/brainsait-learn-digital-access-library-membership`,
  buildMonthly: `${STORE_BASE}/products/build-forge-incubator-founders-program-1`,
  solutionMonthly: `${STORE_BASE}/products/solutions-brainsait-super-partner-program-1`,
  
  // One-time purchase / milestone products
  buildTicket: `${STORE_BASE}/products/build-full-program-ticket`,
  solutionReady: `${STORE_BASE}/collections/solutions-ready`,
  solutionReadyProduct: `${STORE_BASE}/products/solutions-ready-enterprise-deployment-1`,
  
  // Collections
  learnBooks: `${STORE_BASE}/collections/learn-books`,
  solutionsReady: `${STORE_BASE}/collections/solutions-ready`,
  
  // BPR — BrainSAIT Provider Registry
  bpr: `${STORE_BASE}/products/provider-registry`,
  bprAnnual: `${STORE_BASE}/products/provider-registry`,
  bprMonthly: `${STORE_BASE}/products/provider-registry`,
  
  // External ecosystem links
  registry: 'https://registry.brainsait.org',
  calendar: 'https://calendar.app.google/Ve9KSKmaVA6ehDP48',
  calendarBuild: 'https://calendar.app.google/rAqiE6pNumtECdnd7',
  notioFounders: 'https://fadil369.notion.site/Founder-OS-3ba3479c6f628117966fd1be6c120ac2',
  notioBrain: 'https://fadil369.notion.site/Ultimate-Brain-3bc3479c6f628177afd7fb7e9224c19c',
  telegramBot: 'https://t.me/brainsait_forge_bot',
  benefits: `${STORE_BASE}/pages/benefits`,
};