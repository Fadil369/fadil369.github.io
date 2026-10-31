// render-og.mjs — share images (1200×630) for the BPR pages, drawn from the registry snapshot.
// One per provider, so a shared /bpr/p/{SPID} link never shows another person, plus one for BPR.
// Every trust dimension is shown separately and "Not assessed" stays visible.
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const snap = join(root, 'public', 'assets', 'bpr-data');
const out = join(root, 'public', 'assets', 'og');
mkdirSync(out, { recursive: true });

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const LABEL = { identity: 'ORCID identity', signature: 'Signed credential', membership: 'Membership', licence: 'Professional licence', qualifications: 'Qualifications', privileges: 'Hospital privileges' };
const VALUE = { confirmed: 'Confirmed', not_linked: 'Not linked', current: 'Current', none: 'None', active: 'Active', renew_due: 'Renewal due', expired: 'Expired', not_assessed: 'Not assessed' };
const POS = new Set(['confirmed', 'current', 'active']);

const shell = (body) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Almarai:wght@700&family=IBM+Plex+Mono:wght@500&family=Manrope:wght@500;700&family=Playfair+Display:wght@500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}body{width:1200px;height:630px;background:#090a08;color:#f4f3e9;font-family:Manrope,sans-serif;position:relative;overflow:hidden;
background-image:linear-gradient(rgba(237,243,74,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(237,243,74,.04) 1px,transparent 1px);background-size:60px 60px}
.bar{position:absolute;inset:0 0 auto;height:10px;background:#edf34a}.wrap{position:absolute;inset:60px 70px 56px}
.k{font:500 18px 'IBM Plex Mono',monospace;color:#edf34a;letter-spacing:.14em}h1{font:500 64px/1.05 'Playfair Display',serif;margin:18px 0 6px;letter-spacing:-.02em}
.ar{font:700 30px Almarai,sans-serif;color:#aaa99d;direction:rtl;text-align:left}.spid{font:500 26px 'IBM Plex Mono',monospace;color:#edf34a;margin-top:10px}
.grid{position:absolute;left:0;right:0;bottom:46px;display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(244,243,233,.16);border:1px solid rgba(244,243,233,.16)}
.c{background:#11120e;padding:14px 18px}.c span{display:block;font-size:16px;color:#aaa99d}.c b{display:block;font-size:22px;margin-top:4px}.c.pos b{color:#9fe870}.c.na b{color:#f5c97a}
.foot{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-between;font:500 15px 'IBM Plex Mono',monospace;color:#aaa99d}
</style></head><body><div class="bar"></div><div class="wrap">${body}</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
const render = async (html, file) => {
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(out, file) });
};

const manifest = existsSync(join(snap, 'manifest.json')) ? JSON.parse(readFileSync(join(snap, 'manifest.json'), 'utf8')) : { snapshotAt: new Date().toISOString() };
const asOf = String(manifest.snapshotAt).slice(0, 10);
let n = 0;
const list = existsSync(join(snap, 'providers.json')) ? JSON.parse(readFileSync(join(snap, 'providers.json'), 'utf8')).items || [] : [];
for (const p of list) {
  if (!/^SA-[A-Z]{2,4}-\d{6}$/.test(p.spid)) continue;
  const cells = Object.keys(LABEL).map((k) => {
    const v = p.trust?.[k] || 'none';
    return `<div class="c ${POS.has(v) ? 'pos' : v === 'not_assessed' ? 'na' : ''}"><span>${LABEL[k]}</span><b>${esc(VALUE[v] || v)}</b></div>`;
  }).join('');
  await render(shell(`<div class="k">BPR · BRAINSAIT PROVIDER REGISTRY</div><h1>${esc(p.name_en)}</h1><div class="ar">${esc(p.name_ar)}</div><div class="spid">${esc(p.spid)}</div>
<div class="grid">${cells}</div><div class="foot"><span>Each state shown separately · as of ${asOf}</span><span>fadil369.github.io/bpr</span></div>`), `${p.spid}.png`);
  n += 1;
}
await render(shell(`<div class="k">BPR · BRAINSAIT PROVIDER REGISTRY</div><h1 style="font-size:76px;max-width:900px">One trusted identity.<br>Anyone can check it.</h1>
<div class="ar" style="margin-top:18px">هوية واحدة موثوقة. يمكن لأي شخص التحقق منها.</div>
<div class="foot"><span>Signed credentials · transparency log · FHIR R4 · checked in your browser</span><span>fadil369.github.io/bpr</span></div>`), 'bpr.png');
// App icons: the EF monogram used across the site (favicon, card, header).
const iconDir = join(root, 'public', 'assets', 'icons');
mkdirSync(iconDir, { recursive: true });
const icon = (size, pad) => `<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@800&display=swap" rel="stylesheet">
<style>*{margin:0}body{width:${size}px;height:${size}px;background:#090a08;display:grid;place-items:center}
div{width:${size - pad * 2}px;height:${size - pad * 2}px;background:#edf34a;display:grid;place-items:center;color:#111207;font:800 ${Math.round((size - pad * 2) * 0.42)}px Manrope,sans-serif;letter-spacing:-.04em}</style></head><body><div>EF</div></body></html>`;
for (const [file, size, pad] of [['icon-192.png', 192, 18], ['icon-512.png', 512, 48], ['icon-maskable-512.png', 512, 104], ['apple-touch-icon.png', 180, 16]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(icon(size, pad), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(iconDir, file) });
}
await browser.close();
console.log(`og: ${n} provider image(s) + bpr.png → public/assets/og/`);
