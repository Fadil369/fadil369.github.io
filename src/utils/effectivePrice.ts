export interface Priced {
  price?: number | null;
  offerPrice?: number | null;
  offerLabel?: string | null;
  offerUntil?: string | null;
  free?: boolean;
}

export interface EffectivePrice {
  current: number;
  was: number | null;
  badge: string | null;
  expired: boolean;
  free: boolean;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function fromHalala(minor: string | number | null | undefined): number {
  if (minor === null || minor === undefined || minor === '') return 0;
  const n = typeof minor === 'number' ? minor : Number(minor);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n) / 100;
}

export function effectivePrice(item: Priced, today?: string): EffectivePrice {
  const now = today ?? new Date().toISOString().slice(0, 10);
  const base = typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : 0;
  const offer = item.offerPrice;
  const until = item.offerUntil;

  const usable =
    typeof offer === 'number' &&
    Number.isFinite(offer) &&
    offer > 0 &&
    offer < base &&
    typeof until === 'string' &&
    ISO_DATE.test(until) &&
    until >= now;

  if (usable) {
    return {
      current: offer,
      was: base,
      badge: item.offerLabel ?? null,
      expired: false,
      free: false,
    };
  }

  const hadOffer =
    typeof offer === 'number' && Number.isFinite(offer) && offer > 0;

  return {
    current: base,
    was: null,
    badge: null,
    expired: hadOffer && Boolean(until),
    free: Boolean(item.free),
  };
}

export function isBuyable(item: unknown): boolean {
  if (item === null || typeof item !== 'object') return false;
  const record = item as Record<string, unknown>;
  return record.available !== false && record.purchasable !== false;
}