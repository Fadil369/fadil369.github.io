// render-cv-pdf.mjs — print the published /cv page to one-page A4 PDFs, English and Arabic.
// Runs after publish.mjs: serves the repo root, prints with the page's own @page rules, and
// refuses to write a PDF that is not exactly one page (the print layout clips, so overflow would
// otherwise vanish silently). The QR stamp is taken live from the transparency log at render time.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { serve } from './lib-serve.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const server = await serve(root);
const base = server.base;

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
