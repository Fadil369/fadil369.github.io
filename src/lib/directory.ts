// BRAINSAIT: pure directory logic (filter, sort, gap analysis, shareable URL state, CSV).
// MEDICAL: trust dimensions are never merged into a score. "Checks completed" counts how many
// dimensions have been checked at all (positive or negative); it says nothing about quality.
import type { Provider, Trust } from './bpr.ts';

export const DIMENSIONS = ['identity', 'signature', 'membership', 'licence', 'qualifications', 'privileges'] as const;
export type Dimension = keyof Trust;
export type Filter = 'all' | 'orcid' | 'signed' | 'member';
export type Sort = 'name' | 'gaps' | 'spid';
export type View = 'cards' | 'list';
export interface DirectoryState { q: string; filter: Filter; sort: Sort; view: View; gap: Dimension | null }
export const DEFAULT_STATE: DirectoryState = { q: '', filter: 'all', sort: 'name', view: 'cards', gap: null };

// Same sets as TrustTone in BprKit: a dimension is "checked" when it reads positive or negative.
const CHECKED = new Set(['confirmed', 'current', 'active', 'verified', 'renew_due', 'expired', 'revoked', 'superseded']);
export const isChecked = (value: string | null | undefined) => !!value && CHECKED.has(value);

export function coverage(trust: Trust) {
  const gaps = DIMENSIONS.filter((d) => !isChecked(trust[d]));
  return { checked: DIMENSIONS.length - gaps.length, total: DIMENSIONS.length, gaps };
}

/** Per-dimension count of providers whose dimension has been checked: the registry-level gap map. */
export function registryCoverage(items: Provider[]) {
  return DIMENSIONS.map((d) => ({ dimension: d, checked: items.filter((p) => isChecked(p.trust[d])).length, total: items.length }));
}

export const normalise = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[ً-ٰٟ]/g, '').replace(/[أإآ]/g, 'ا');

export function applyDirectory(items: Provider[], s: DirectoryState): Provider[] {
  const n = normalise(s.q.trim());
  const out = items.filter((p) => {
    if (s.filter === 'orcid' && p.trust.identity !== 'confirmed') return false;
    if (s.filter === 'signed' && p.trust.signature !== 'current') return false;
    if (s.filter === 'member' && !['active', 'renew_due'].includes(p.membership)) return false;
    if (s.gap && isChecked(p.trust[s.gap])) return false;
    return !n || [p.name_en, p.name_ar, p.spid, p.specialty || '', p.type].some((f) => normalise(f).includes(n));
  });
  const by: Record<Sort, (a: Provider, b: Provider) => number> = {
    name: (a, b) => a.name_en.localeCompare(b.name_en),
    spid: (a, b) => a.spid.localeCompare(b.spid),
    gaps: (a, b) => coverage(b.trust).gaps.length - coverage(a.trust).gaps.length || a.spid.localeCompare(b.spid),
  };
  return [...out].sort(by[s.sort]);
}

const FILTERS: Filter[] = ['all', 'orcid', 'signed', 'member'];
const SORTS: Sort[] = ['name', 'gaps', 'spid'];
const VIEWS: View[] = ['cards', 'list'];

/** Parse shareable state from a query string. Unknown or tampered values fall back to defaults. */
export function parseState(search: string | URLSearchParams): DirectoryState {
  const p = typeof search === 'string' ? new URLSearchParams(search) : search;
  const pick = <T extends string>(v: string | null, allowed: readonly T[], fallback: T): T => (allowed as readonly string[]).includes(v ?? '') ? (v as T) : fallback;
  return {
    q: (p.get('q') || '').slice(0, 120),
    filter: pick(p.get('f'), FILTERS, 'all'),
    sort: pick(p.get('sort'), SORTS, 'name'),
    view: pick(p.get('view'), VIEWS, 'cards'),
    gap: (DIMENSIONS as readonly string[]).includes(p.get('gap') ?? '') ? (p.get('gap') as Dimension) : null,
  };
}

export function serializeState(s: DirectoryState): string {
  const p = new URLSearchParams();
  if (s.q) p.set('q', s.q);
  if (s.filter !== 'all') p.set('f', s.filter);
  if (s.sort !== 'name') p.set('sort', s.sort);
  if (s.view !== 'cards') p.set('view', s.view);
  if (s.gap) p.set('gap', s.gap);
  return p.toString();
}

const csvCell = (v: unknown) => {
  let t = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; // neutralise spreadsheet formula injection
  return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
};

/** Public registry fields only, one row per provider. No patient data exists in this dataset. */
export function toCsv(items: Provider[]): string {
  const head = ['spid', 'name_en', 'name_ar', 'type', 'specialty', ...DIMENSIONS, 'checks_completed', 'open_gaps', 'profile_url'];
  const rows = items.map((p) => {
    const c = coverage(p.trust);
    return [p.spid, p.name_en, p.name_ar, p.type, p.specialty, ...DIMENSIONS.map((d) => p.trust[d]), `${c.checked}/${c.total}`, c.gaps.join(' '), p.profile_url];
  });
  return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
