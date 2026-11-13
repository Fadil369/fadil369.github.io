import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDirectory, coverage, DEFAULT_STATE, parseState, registryCoverage, serializeState, toCsv } from './directory.ts';
import type { Provider } from './bpr.ts';
const mk = (spid: string, name: string, trust: Record<string, string>, extra: Partial<Provider> = {}) => ({
  spid, type: 'physician', name_en: name, name_ar: 'د. ' + name, specialty: null, profile_url: 'https://x/' + spid, orcid: null, research_url: null,
  verification: { credentials: '', signature: '', domain_ownership: '' }, trust_summary: '', trust_summary_ar: '', membership: trust.membership || 'none', membership_valid_to: null,
  trust: { identity: 'not_linked', signature: 'none', membership: 'none', licence: 'not_assessed', qualifications: 'not_assessed', privileges: 'none', ...trust }, ...extra,
}) as Provider;
const a = mk('SA-PHY-000001', 'Alpha', {});
const c = mk('SA-PHY-000003', 'Charlie', { identity: 'confirmed', signature: 'current', membership: 'active' });
const b = mk('SA-PHY-000002', '=Bravo', { identity: 'confirmed' });
const all = [a, c, b];

test('coverage counts checked dimensions without merging them into a score', () => {
  assert.deepEqual(coverage(c.trust), { checked: 3, total: 6, gaps: ['licence', 'qualifications', 'privileges'] });
  assert.equal(coverage(a.trust).checked, 0);
});
test('registry coverage is per dimension', () => {
  const m = Object.fromEntries(registryCoverage(all).map((r) => [r.dimension, r.checked]));
  assert.equal(m.identity, 2); assert.equal(m.signature, 1); assert.equal(m.licence, 0);
});
test('filter, gap filter and sort compose', () => {
  assert.deepEqual(applyDirectory(all, { ...DEFAULT_STATE, filter: 'orcid' }).map((p) => p.spid), ['SA-PHY-000002', 'SA-PHY-000003']);
  assert.deepEqual(applyDirectory(all, { ...DEFAULT_STATE, gap: 'identity' }).map((p) => p.spid), ['SA-PHY-000001']);
  assert.equal(applyDirectory(all, { ...DEFAULT_STATE, sort: 'gaps' })[0].spid, 'SA-PHY-000001');
  assert.equal(applyDirectory(all, { ...DEFAULT_STATE, q: 'د. alpha' }).length, 1);
  assert.equal(applyDirectory(all, { ...DEFAULT_STATE, q: 'charlie' }).length, 1);
  assert.equal(applyDirectory(all, { ...DEFAULT_STATE, q: 'zzz-none' }).length, 0);
});
test('url state round-trips and rejects tampered values', () => {
  const s = { q: 'fhir', filter: 'signed', sort: 'gaps', view: 'list', gap: 'licence' } as const;
  assert.deepEqual(parseState(serializeState(s)), s);
  assert.equal(serializeState(DEFAULT_STATE), '');
  assert.deepEqual(parseState('f=<script>&sort=x&view=y&gap=zzz&q=' + 'a'.repeat(500)), { ...DEFAULT_STATE, q: 'a'.repeat(120) });
});
test('csv escapes quotes and neutralises formula injection', () => {
  const rows = toCsv([b, mk('SA-PHY-000009', 'Say "hi", ok', {})]).trim().split('\r\n');
  assert.equal(rows.length, 3);
  assert.ok(rows[1].includes("'=Bravo"));
  assert.ok(rows[2].includes('"Say ""hi"", ok"'));
});
