// Detection tests use an invented message, because the official samples are not for redistribution.
// The same checker was also run over CHI's sample set (see the audit); that set is not committed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkBundle, makeSpec } from './nphiesCheck.ts';
import { brokenDemoBundle, demoBundle } from '../data/nphiesDemo.ts';

const KB = fileURLToPath(new URL('../../public/assets/bpr-data/nphies/v1/', import.meta.url));
const load = (n: string) => JSON.parse(readFileSync(KB + n + '.json', 'utf8'));
const spec = makeSpec(load('profiles'), load('code-systems'), load('practice-codes'));
const ids = (b: unknown) => checkBundle(b as any, spec).findings.map((f) => f.id);
const errors = (b: unknown) => checkBundle(b as any, spec).findings.filter((f) => f.severity === 'error');
const claimOf = (b: any) => b.entry.find((e: any) => e.resource.resourceType === 'Claim').resource;

test('the clean demo message has no errors', () => {
  assert.deepEqual(errors(demoBundle()).map((f) => `${f.id} ${f.where}`), []);
});

test('the broken demo message shows the mistakes it was built with', () => {
  const found = new Set(ids(brokenDemoBundle()));
  for (const id of ['hijri', 'icd-edition', 'principal', 'practice-code', 'ref-careteam', 'total', 'required', 'practitioner-license']) assert.ok(found.has(id), id);
});

// Each mutation breaks one thing and must raise its check, and only then.
const mutations: [string, (b: any) => void][] = [
  ['bundle-type', (b) => { b.type = 'collection'; }],
  ['header-first', (b) => { b.entry.reverse(); }],
  ['focus', (b) => { b.entry[0].resource.focus[0].reference = 'http://example.invalid/Claim/none'; }],
  ['reference', (b) => { claimOf(b).insurer.reference = 'http://example.invalid/Organization/none'; }],
  ['sequence-dup', (b) => { const c = claimOf(b); c.careTeam.push({ ...c.careTeam[0] }); }],
  ['ref-diagnosis', (b) => { claimOf(b).item[0].diagnosisSequence = [9]; }],
  ['ref-info', (b) => { claimOf(b).item[0].informationSequence = [9]; }],
  ['item-net', (b) => { claimOf(b).item[0].net.value = 999; claimOf(b).total.value = 999; }],
  ['total', (b) => { claimOf(b).total.value = 1; }],
  ['currency', (b) => { claimOf(b).item[0].net.currency = 'USD'; }],
  ['birth-after-service', (b) => { b.entry.find((e: any) => e.resource.resourceType === 'Patient').resource.birthDate = '2026-12-31'; }],
  ['coverage-start', (b) => { b.entry.find((e: any) => e.resource.resourceType === 'Coverage').resource.period.start = '2026-12-01'; }],
  ['encounter-order', (b) => { b.entry.find((e: any) => e.resource.resourceType === 'Encounter').resource.period.end = '2026-10-01'; }],
  ['drg-setting', (b) => { claimOf(b).item[0].productOrService.coding[0].system = 'http://nphies.sa/terminology/CodeSystem/DRG'; }],
];
for (const [id, mutate] of mutations) {
  test(`detects ${id}`, () => {
    assert.ok(!ids(demoBundle()).includes(id), `${id} fired on the clean message`);
    const b = demoBundle();
    mutate(b);
    assert.ok(ids(b).includes(id), `${id} was not raised`);
  });
}

test('DRG shadow billing needs an extra non-DRG item', () => {
  const b = demoBundle();
  const enc = b.entry.find((e: any) => e.resource.resourceType === 'Encounter').resource;
  enc.class.code = 'IMP';
  const c = claimOf(b);
  c.type.coding[0].code = 'institutional';
  c.item[0].productOrService.coding[0].system = 'http://nphies.sa/terminology/CodeSystem/drg';
  c.item[0].unitPrice.value = 0; c.item[0].net.value = 0; c.item[0].extension = []; c.total.value = 1;
  assert.ok(ids(b).includes('drg-shadow-extra'));
});

test('malformed input never throws', () => {
  for (const bad of ['', '{', 'null', '[]', '{"resourceType":"Bundle"}', '{"resourceType":"Bundle","type":"message","entry":[{}]}', '{"resourceType":"Patient"}']) {
    assert.doesNotThrow(() => checkBundle(bad, spec));
    assert.equal(checkBundle(bad, spec).ok, false);
  }
});

test('a pasted template placeholder is an error', () => {
  assert.ok(ids(JSON.stringify(demoBundle()).replace('DEMO-CLAIM-1', '{{claimId}}')).includes('placeholder'));
});

// Publishing gate: this repository is public.
test('every published source is labelled Public', () => {
  const m = load('manifest');
  assert.ok(m.sources.length >= 4);
  for (const s of m.sources) assert.equal(s.label, 'Public', s.document);
});

test('restricted and licensed content stays out of the published files', () => {
  // Shapes, not values: this file is public too, so it must not quote the restricted content itself.
  const blob = readdirSync(KB).map((f) => readFileSync(KB + f, 'utf8')).join('\n');
  const shapes: [string, RegExp][] = [
    ['SBS code', /\b\d{5}-\d{2}-\d{2}\b/],
    ['AR-DRG code', /"\d{3}[A-Z]"/],
    ['validation rule ID', /\b(BV|IC|IB|DT|RE|GE|FR)-\d{5}\b/],
    ['payer or TPA ID', /\b70\d{8}\b/],
    ['facility ID', /\b1000\d{10}\b/],
    ['GMDN attribution', /GMDN Agency/i],
  ];
  for (const [name, re] of shapes) assert.ok(!re.test(blob), `published data contains a ${name}`);
  const systems = load('code-systems').items;
  for (const s of systems) {
    if (/icd-10|\/drg$|maternity|procedures|oral-health|imaging|laboratory|medical-devices|medication-codes|scientific-codes/i.test(s.url)) assert.equal(s.codes, null, s.url);
  }
});

test('every rejection reason has bilingual guidance, an owner and a route', () => {
  const r = load('rejection-reasons');
  assert.equal(r.items.length, 71);
  for (const i of r.items) {
    for (const k of ['official', 'en', 'ar', 'doEn', 'doAr']) assert.ok(i[k]?.trim(), `${i.code} ${k}`);
    assert.ok(r.owners[i.owner], `${i.code} owner`);
    assert.ok(r.routes[i.route], `${i.code} route`);
    assert.ok(r.families[i.code.slice(0, 2)], `${i.code} family`);
    assert.ok(/[؀-ۿ]/.test(i.ar) && /[؀-ۿ]/.test(i.doAr), `${i.code} Arabic`);
  }
});
