/**
 * Analytics — Google Tag Manager + GA4 (via GTM) + Meta (Facebook) Pixel.
 * Shared with store.brainsait.org (GTM-TP24GSTF · GA4 G-75ZCDM8R74 ·
 * Meta pixel 850048551165707).
 *
 * Every call is safe: it no-ops if the tag libraries are not loaded yet
 * (offline, ad-blockers) and never blocks the UI.
 */

declare global {
  interface Window {
    dataLayer: unknown[];
    fbq?: (...args: unknown[]) => void;
  }
}

export const GTM_ID = 'GTM-TP24GSTF';
export const GA4_ID = 'G-75ZCDM8R74';
export const META_PIXEL_ID = '850048551165707';

export function track(event: string, params: Record<string, unknown> = {}): void {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...params });
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', event, params);
    }
  } catch {
    /* analytics must never break the storefront */
  }
}

export function trackViewItem(item: {
  item_id: string;
  item_name: string;
  item_category?: string;
  price?: number;
}): void {
  track('view_item', {
    currency: 'SAR',
    value: item.price ?? 0,
    items: [{ ...item, item_category: item.item_category || 'General' }],
  });
}

export function trackBeginCheckout(value: number, items: unknown[] = []): void {
  track('begin_checkout', { currency: 'SAR', value, items });
}

/**
 * Journey event sink — posts funnel/identity stages to the build-apply
 * worker, which logs them to D1 and re-broadcasts them on the hub event bus
 * (Lark ops cards + per-person journey ledger when an email is attached).
 * Fire-and-forget: keepalive so it survives the checkout navigation.
 */
const JOURNEY_EVENTS_URL = 'https://build-apply.brainsait.org/events/';

export function journeyEvent(stage: string, params: Record<string, unknown> = {}): void {
  try {
    const body: Record<string, unknown> = { ...params, _ts: new Date().toISOString() };
    // Worker expects student_email; hub/journey_engine expects email — send both
    if (body.email && !body.student_email) body.student_email = body.email;
    if (body.student_email && !body.email) body.email = body.student_email;
    void fetch(JOURNEY_EVENTS_URL + stage, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => { /* journey events must never break the storefront */ });
  } catch {
    /* journey events must never break the storefront */
  }
}
