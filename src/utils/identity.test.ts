import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVCard, extractSpid, OWNER } from './identity.ts';

test('SPID found in the forms a QR or link can take', () => {
  assert.equal(extractSpid('SA-PHY-000003'), 'SA-PHY-000003');
  assert.equal(extractSpid('  sa-phy-000003 '), 'SA-PHY-000003');
  assert.equal(extractSpid('https://fadil369.github.io/bpr/verify?spid=SA-PHY-000003'), 'SA-PHY-000003');
  assert.equal(extractSpid('https://registry.brainsait.de/p/SA-PHY-000001'), 'SA-PHY-000001');
  assert.equal(extractSpid('https://verify.brainsait.de/SA-NUR-000042'), 'SA-NUR-000042');
  assert.equal(extractSpid('https://registry.brainsait.de/verify?spid=SA-PHY-000002#vc=x'), 'SA-PHY-000002');
});

test('no SPID means null, not a guess', () => {
  assert.equal(extractSpid('https://fadil369.github.io/'), null);
  assert.equal(extractSpid('SA-PHY-03'), null);
  assert.equal(extractSpid(''), null);
  assert.equal(extractSpid(null), null);
});

test('vCard has required fields, CRLF endings and escaped text', () => {
  const v = buildVCard(OWNER);
  assert.ok(v.startsWith('BEGIN:VCARD\r\nVERSION:4.0\r\n'));
  assert.ok(v.endsWith('END:VCARD\r\n'));
  assert.ok(v.includes('FN:Dr. Mohamed El Fadil\r\n'));
  assert.ok(v.includes('N:El Fadil;Mohamed;;Dr.;'));
  assert.ok(v.includes('TITLE:RCM\\, Healthcare Intelligent Improvement Advisor'));
  assert.ok(v.includes('TEL;TYPE=cell;VALUE=uri:tel:+966543560672'));
  assert.ok(!/\r\n(?! )[^\r\n]{76,}/.test(v), 'no unfolded line longer than 75');
});

test('long lines fold into continuation lines that rejoin exactly', () => {
  const v = buildVCard({ ...OWNER, note: 'ملاحظة '.repeat(30) });
  const unfolded = v.replace(/\r\n /g, '');
  assert.ok(unfolded.includes('NOTE:' + 'ملاحظة '.repeat(30).trimEnd()) || unfolded.includes('NOTE:' + 'ملاحظة '.repeat(30)));
  for (const line of v.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
});
