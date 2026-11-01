// Copy lint: catches the slips a bilingual site makes when text is pasted between languages —
// a word from another script inside Arabic (e.g. Hindi "इसलिए"), Persian letters standing in for
// Arabic ones (ی for ي, ک for ك), and Latin glued onto an Arabic word ("أداة.Provider").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const files: string[] = [];
const walk = (d: string) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { if (f !== 'node_modules') walk(p); }
    else if (/\.(tsx?|mjs|html)$/.test(f) && !/\.test\.ts$/.test(f)) files.push(p);
  }
};
['src', 'scripts'].forEach((d) => walk(join(ROOT, d)));

// Greek, Cyrillic, Hebrew, Indic, Thai, kana, CJK, Hangul, and the Persian/Urdu-only letters.
const FOREIGN = /[Ͱ-ϿЀ-ӿ֐-׿ऀ-෿฀-๿぀-ヿ一-鿿가-힯پچژکگی]/u;
const ARABIC = /[ء-ي]/;
const LATIN = /[A-Za-z]/;
// A token may mix scripts only as a one-letter Arabic prefix (و ب ل ك ف, optional tatweel) on a Latin term.
const PREFIXED = /^[«(]?[وبلكف]?ـ?[A-Za-z0-9][\w.\-/+:#@&·₀-₉…]*[»)]?[،؛.:!؟,)…]*$/;

const lines = files.flatMap((f) => readFileSync(f, 'utf8').split('\n').map((text, i) => ({ at: `${f.slice(ROOT.length)}:${i + 1}`, text })));

test('copy has no foreign-script or Persian letters', () => {
  const bad = lines.filter((l) => FOREIGN.test(l.text)).map((l) => `${l.at} ${l.text.match(FOREIGN)![0]}`);
  assert.deepEqual(bad, []);
});

test('Latin is never glued onto an Arabic word', () => {
  const bad = lines.flatMap((l) => l.text.split(/[\s'"`{}()<>=]+/)
    .filter((t) => ARABIC.test(t) && LATIN.test(t) && !t.includes('[') && !t.startsWith('/') && !PREFIXED.test(t))
    .map((t) => `${l.at} ${t}`));
  assert.deepEqual(bad, []);
});

test('the lint itself catches the known slips', () => {
  assert.ok(FOREIGN.test('المطالبات. इसलिए أبني'));
  assert.ok(FOREIGN.test('سیستم'));
  assert.ok(!PREFIXED.test('أداة.Provider'));
  assert.ok(PREFIXED.test('وFHIR،'));
});
