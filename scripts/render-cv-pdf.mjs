// render-cv-pdf.mjs — print the published /cv page to one-page A4 PDFs, English and Arabic.
// Runs after publish.mjs: serves the repo root, prints with the page's own @page rules, and
// refuses to write a PDF that is not exactly one page (the print layout clips, so overflow would
// otherwise vanish silently). The QR stamp is taken live from the transparency log at render time.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = join(root, p);
  if (!f.startsWith(root)) { res.writeHead(403).end(); return; }
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) f = join(root, '404.html');
  res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }).end(readFileSync(f));
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}`;

const OUT = [['en', 'Dr_Mohamed_El_Fadil_CV_2026_Redesigned.pdf'], ['ar', 'Dr_Mohamed_El_Fadil_CV_2026_AR.pdf']];
const browser = await chromium.launch();
let failed = false;
for (const [lang, file] of OUT) {
  const ctx = await browser.newContext({ viewport: { width: 794, height: 1123 } });
  await ctx.addInitScript((l) => localStorage.setItem('bs-lang', l), lang);
  const page = await ctx.newPage();
  await page.goto(`${base}/cv/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.cv-identity-qr svg', { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  if (pages !== 1) { console.error(`cv-pdf: ${lang} rendered ${pages} pages — not written`); failed = true; await ctx.close(); continue; }
  for (const dir of ['public/assets', 'assets']) { mkdirSync(join(root, dir), { recursive: true }); writeFileSync(join(root, dir, file), pdf); }
  console.log(`cv-pdf: ${lang} → ${file} (1 page, ${Math.round(pdf.length / 1024)} KB)`);
  await ctx.close();
}
await browser.close();
server.close();
if (failed) process.exit(1);
