import { useEffect, useState } from 'react';

// Data layer for the BPR pages on GitHub Pages.
//
// Every read goes to registry.brainsait.de first (all public routes send CORS *). If the
// registry cannot be reached, the page falls back to the snapshot written at build time by
// scripts/snapshot-bpr.mjs. Each result says which source it came from, and the pages
// show it — a snapshot is never presented as live data.
//
// Signatures are checked on the visitor's device with WebCrypto Ed25519 (same rules as
// registry.brainsait.de/verify); the registry's /vc/verify is only a fallback for
// browsers without Ed25519.

export const REGISTRY = 'https://registry.brainsait.de';
export const SNAPSHOT = '/assets/bpr-data';
export const SPID_RE = /^SA-[A-Z]{2,4}-\d{6}$/;

export type Source = 'live' | 'snapshot';
export interface Loaded<T> { data: T; source: Source }

const cache = new Map<string, Promise<Loaded<unknown>>>();

// A hung registry must not hang the page: give up after 8 s and let the snapshot answer.
const TIMEOUT_MS = 8000;
function timeoutSignal(ms: number): AbortSignal | undefined {
  const A = AbortSignal as typeof AbortSignal & { timeout?: (ms: number) => AbortSignal };
  return typeof A.timeout === 'function' ? A.timeout(ms) : undefined;
}

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: 'no-store', signal: timeoutSignal(TIMEOUT_MS) });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json() as Promise<T>;
}

/** Live registry first, build-time snapshot second. */
export function load<T>(livePath: string, snapshotFile: string): Promise<Loaded<T>> {
  const key = livePath + '|' + snapshotFile;
  if (!cache.has(key)) {
    const p = json<T>(REGISTRY + livePath)
      .then((data) => ({ data, source: 'live' as const }))
      .catch(() => json<T>(`${SNAPSHOT}/${snapshotFile}`).then((data) => ({ data, source: 'snapshot' as const })));
    p.catch(() => cache.delete(key));
    cache.set(key, p as Promise<Loaded<unknown>>);
  }
  return cache.get(key) as Promise<Loaded<T>>;
}

export type Async<T> = { state: 'loading' } | { state: 'error'; error: string } | ({ state: 'ready' } & Loaded<T>);

export function useLoad<T>(livePath: string | null, snapshotFile: string): Async<T> {
  const [v, setV] = useState<Async<T>>({ state: 'loading' });
  useEffect(() => {
    if (!livePath) { setV({ state: 'error', error: 'invalid' }); return; }
    let alive = true;
    setV({ state: 'loading' });
    load<T>(livePath, snapshotFile).then(
      (r) => alive && setV({ state: 'ready', ...r }),
      (e) => alive && setV({ state: 'error', error: String(e?.message || e) }),
    );
    return () => { alive = false; };
  }, [livePath, snapshotFile]);
  return v;
}

// ── registry shapes (public fields only) ─────────────────────────────────────

export type Trust = Record<'identity' | 'signature' | 'membership' | 'licence' | 'qualifications' | 'privileges', string>;
export interface Provider {
  spid: string;
  type: string;
  name_en: string;
  name_ar: string;
  specialty: string | null;
  publisher_oid_root?: string;
  profile_url: string;
  passport_url?: string | null;
  orcid: string | null;
  research_url: string | null;
  verification: { credentials: string; signature: string; domain_ownership: string };
  trust: Trust;
  trust_summary: string;
  trust_summary_ar: string;
  membership: string;
  membership_valid_to: string | null;
  card_url?: string;
  updated_at?: string;
}
export interface ProviderList { items: Provider[]; note?: string }
export interface Manifest { source: string; snapshotAt: string; spids: string[] }

export interface ResearchWork {
  title: string; kind: string; year: string; url: string; doi?: string;
  sources?: Record<string, string>;
  metrics?: { zenodo?: { views?: number; downloads?: number }; hf?: { downloads?: number; likes?: number } };
  authorship?: { status: string };
  in_community?: boolean;
}
export interface Research {
  spid: string; orcid: string; community_url?: string; works: ResearchWork[];
  counts: Record<string, number>;
  metrics: { zenodo_views: number; zenodo_downloads: number; hf_downloads: number };
  authorship_rule?: string; note?: string;
  runs?: Record<string, { ok: number; note: string; at: string }>;
}
export interface OpsStatus {
  checked_at: string;
  sites: Record<string, string>;
  operations?: { verdict: string; checked_at: string; checks: Record<string, string> };
}
export interface FhirCapability {
  fhirVersion: string; version: string; title: string; date: string;
  rest: { resource: { type: string; interaction?: { code: string }[]; searchParam?: { name: string; type: string; documentation?: string }[] }[] }[];
}

export const providers = () => load<ProviderList>('/api/providers', 'providers.json');
export const manifest = () => json<Manifest>(`${SNAPSHOT}/manifest.json`);

export function useManifest() {
  const [m, setM] = useState<Manifest | null>(null);
  useEffect(() => { manifest().then(setM, () => setM(null)); }, []);
  return m;
}

// ── verification (ported from the elfadil landing, same algorithm as /verify) ───

export type CheckState = 'pending' | 'ok' | 'fail' | 'unavailable';
export interface Check { state: CheckState; detail?: string; how?: 'device' | 'server' }
export interface Jwk { kty: string; crv: string; x: string; kid?: string }
export interface CredentialClaims {
  id: string; validFrom: string; validUntil: string;
  issuer: { id: string; name: string };
  credentialSubject: {
    id: string; spid: string; name: string; nameAr?: string; profession: string; specialty?: string; orcid?: string;
    verificationLevel?: string; membership?: { state: string; validTo?: string };
    qualifications?: { kind: string; issuer?: string; state: string }[]; fhir?: string;
  };
}

const enc = new TextEncoder();
const dec = new TextDecoder();

export function b64u(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}
function toB64u(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function edVerify(jwk: Jwk, sig: Uint8Array, data: Uint8Array): Promise<boolean> {
  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, crv: jwk.crv, x: jwk.x }, { name: 'Ed25519' }, false, ['verify']);
  return crypto.subtle.verify({ name: 'Ed25519' }, key, sig as BufferSource, data as BufferSource);
}

export async function sha256Hex(s: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)));
  return [...d].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function registryKeys(): Promise<Loaded<Jwk[]>> {
  const r = await load<{ verificationMethod: { publicKeyJwk: Jwk }[] }>('/.well-known/did.json', 'did.json');
  return { data: r.data.verificationMethod.map((m) => m.publicKeyJwk), source: r.source };
}

export function decodeHeader(jwt: string): { alg: string; kid: string; typ?: string } {
  return JSON.parse(dec.decode(b64u(jwt.split('.')[0])));
}
export function decodeClaims(jwt: string): CredentialClaims {
  return JSON.parse(dec.decode(b64u(jwt.split('.')[1])));
}

/** Checks a VC-JOSE credential against the registry keys, on this device when possible. */
export async function verifyJwt(jwt: string, jwks: Jwk[]): Promise<Check> {
  const parts = jwt.trim().split('.');
  if (parts.length !== 3) return { state: 'fail', detail: 'not a JWS (expected three dot-separated parts)' };
  let header: { alg: string; kid: string };
  try { header = decodeHeader(jwt.trim()); } catch { return { state: 'fail', detail: 'unreadable header' }; }
  const jwk = jwks.find((k) => k.kid === header.kid);
  if (!jwk) return { state: 'fail', detail: `unknown key ${header.kid}` };
  try {
    const ok = header.alg === 'EdDSA' && (await edVerify(jwk, b64u(parts[2]), enc.encode(parts[0] + '.' + parts[1])));
    return ok ? { state: 'ok', how: 'device' } : { state: 'fail', detail: 'signature does not match', how: 'device' };
  } catch {
    try {
      const r = await (await fetch(`${REGISTRY}/vc/verify`, { method: 'POST', body: jwt.trim(), signal: timeoutSignal(TIMEOUT_MS) })).json();
      return r.ok ? { state: 'ok', how: 'server' } : { state: 'fail', detail: (r.reasons || []).join('; ') || 'rejected', how: 'server' };
    } catch {
      return { state: 'unavailable', detail: 'no Ed25519 in this browser and the registry is unreachable' };
    }
  }
}

/** Same credential with one claim changed and the original signature kept — what a forger would hand over. */
export function forgeName(jwt: string, name: string): string {
  const [h, p, s] = jwt.split('.');
  const claims = JSON.parse(dec.decode(b64u(p)));
  claims.credentialSubject.name = name;
  return [h, toB64u(enc.encode(JSON.stringify(claims))), s].join('.');
}

export interface CredentialResult {
  jwt: string; claims: CredentialClaims; header: { alg: string; kid: string };
  signature: Check; expiry: Check; status: Check & { value?: string }; source: Source; keySource: Source;
}

/** Full check of one provider's current credential: signature, validity window, live status. */
export async function checkCredential(spid: string): Promise<CredentialResult> {
  const [keys, vc] = await Promise.all([registryKeys(), load<{ jwt: string }>(`/vc/${spid}`, `vc/${spid}.json`)]);
  const jwt = vc.data.jwt;
  const claims = decodeClaims(jwt);
  const signature = await verifyJwt(jwt, keys.data);
  const expired = Date.parse(claims.validUntil) < Date.now();
  const expiry: Check = expired ? { state: 'fail', detail: `expired ${claims.validUntil}` } : { state: 'ok', detail: claims.validUntil };
  let status: CredentialResult['status'];
  try {
    const st = await json<{ credential?: { state: string } }>(`${REGISTRY}/vc/status/${spid}?jti=${encodeURIComponent(claims.id)}`);
    const value = st.credential?.state || 'unknown';
    status = { state: value === 'current' ? 'ok' : 'fail', value };
  } catch {
    status = { state: 'unavailable', detail: 'registry unreachable' };
  }
  return { jwt, claims, header: decodeHeader(jwt), signature, expiry, status, source: vc.source, keySource: keys.source };
}

export interface LedgerEntry { seq: number; at: string; event: string; spid: string; jti?: string; hash: string; prev: string; line: string }
export interface LedgerResult {
  head: { size: number; hash: string; at: string; signed: string; kid: string };
  genesis: string; rule?: string; entries: LedgerEntry[];
  chain: Check; headSignature: Check; source: Source;
}

/** Replays the transparency hash chain and checks the signed head on this device. */
export async function replayLedger(): Promise<LedgerResult> {
  const [keys, log] = await Promise.all([
    registryKeys(),
    load<{ head: LedgerResult['head'] & { sig: string }; genesis: string; rule?: string; entries: { seq: number; line: string; hash: string }[] }>(
      '/transparency/log.json', 'transparency/log.json'),
  ]);
  const L = log.data;
  const entries: LedgerEntry[] = [];
  let prev = L.genesis;
  let bad = '';
  for (const [i, e] of L.entries.entries()) {
    const line = JSON.parse(e.line);
    const h = await sha256Hex(e.line);
    if (line.seq !== i + 1 || line.prev !== prev || h !== e.hash) { bad = `entry #${i + 1} breaks the chain`; break; }
    entries.push({ seq: line.seq, at: line.at, event: line.event, spid: line.spid, jti: line.jti, hash: h, prev, line: e.line });
    prev = h;
  }
  if (!bad && L.head.hash !== prev) bad = 'signed head does not match the last entry';
  const chain: Check = bad ? { state: 'fail', detail: bad, how: 'device' } : { state: 'ok', how: 'device' };
  let headSignature: Check;
  const jwk = keys.data.find((k) => k.kid === L.head.kid);
  if (!jwk) headSignature = { state: 'fail', detail: 'unknown key' };
  else {
    try {
      const ok = await edVerify(jwk, b64u(L.head.sig), enc.encode(L.head.signed));
      headSignature = ok ? { state: 'ok', how: 'device' } : { state: 'fail', detail: 'signature does not match' };
    } catch {
      headSignature = { state: 'unavailable', detail: 'no Ed25519 in this browser' };
    }
  }
  return { head: L.head, genesis: L.genesis, rule: L.rule, entries, chain, headSignature, source: log.source };
}

export const short = (h?: string, n = 10) => (h ? `${h.slice(0, n)}…${h.slice(-4)}` : '…');

// ── AI provenance ledger (BrainSAIT Copilot inside each provider's EMR) ─────────

export interface AiHead { instance: string; size: number; hash: string; chain_ok: boolean; signed: string; kid: string; sig: string; check: Check }
export interface AiLedger { heads: AiHead[]; rule?: string; source: Source }

/** Loads the signed AI-provenance heads and checks each signature on this device. */
export async function checkAiLedger(): Promise<AiLedger> {
  const [keys, r] = await Promise.all([
    registryKeys(),
    json<{ heads: Omit<AiHead, 'check'>[]; rule?: string }>(`${REGISTRY}/transparency/ai.json`).then((data) => ({ data, source: 'live' as const })),
  ]);
  const heads = await Promise.all(r.data.heads.map(async (h) => {
    const jwk = keys.data.find((k) => k.kid === h.kid);
    if (!jwk) return { ...h, check: { state: 'fail', detail: 'unknown key' } as Check };
    try {
      const ok = await edVerify(jwk, b64u(h.sig), enc.encode(h.signed));
      return { ...h, check: (ok ? { state: 'ok', how: 'device' } : { state: 'fail', detail: 'signature does not match' }) as Check };
    } catch {
      return { ...h, check: { state: 'unavailable', detail: 'no Ed25519 in this browser' } as Check };
    }
  }));
  return { heads, rule: r.data.rule, source: r.source };
}
