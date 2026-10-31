import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';

const base = process.env.SITE_URL || 'http://127.0.0.1:4173';
await mkdir('.artifacts/design', { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

async function inspect(path, name, mobile = false) {
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  const response = await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
  if (!response?.ok()) throw new Error(`${path} returned ${response?.status()}`);
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflow) throw new Error(`${name} has horizontal overflow`);
  const broken = await page.locator('img').evaluateAll(images => images.filter(image => !image.complete || image.naturalWidth === 0).map(image => image.getAttribute('src')));
  if (broken.length) throw new Error(`${name} broken images: ${broken.join(', ')}`);
  await page.screenshot({ path: `.artifacts/design/${name}.png`, fullPage: true });
  console.log(`PASS ${name}: rendered without overflow or broken images`);
}

await inspect('/', 'home-desktop');
await inspect('/catalogue', 'bpr-desktop');
await inspect('/card', 'card-desktop');
await inspect('/cv', 'cv-desktop');
await page.evaluate(() => { window.__printCalled = false; window.print = () => { window.__printCalled = true; }; });
await page.getByRole('button', { name: 'Print', exact: true }).click();
if (!await page.evaluate(() => window.__printCalled)) throw new Error('CV print button did not invoke window.print');
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: 'public/assets/Dr_Mohamed_El_Fadil_CV_2026_Redesigned.pdf', format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
await page.goto(`${base}/card`, { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'screen' });
await page.evaluate(() => { window.__printCalled = false; window.print = () => { window.__printCalled = true; }; });
await page.getByRole('button', { name: 'Print both sides' }).click();
if (!await page.evaluate(() => window.__printCalled)) throw new Error('Card print button did not invoke window.print');
await page.pdf({ path: '.artifacts/design/card-browser-print.pdf', printBackground: true, preferCSSPageSize: true });
const cardPrint = await readFile('.artifacts/design/card-browser-print.pdf', 'latin1');
if (!cardPrint.includes('/MediaBox [0 0 252 144]')) throw new Error('Browser card print is not 3.5 × 2 inches');
if ((cardPrint.match(/\/Type \/Page\b/g) ?? []).length !== 2) throw new Error('Browser card print does not contain two pages');
console.log('PASS direct print buttons and exact A4 / two-page card print output');
await page.emulateMedia({ media: 'screen' });
await inspect('/', 'home-mobile', true);
await inspect('/card', 'card-mobile', true);
await inspect('/cv', 'cv-mobile', true);
await inspect('/catalogue', 'bpr-mobile', true);

await page.goto(`${base}/card`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'التبديل إلى العربية' }).click();
if (await page.locator('html').getAttribute('dir') !== 'rtl') throw new Error('Arabic direction did not activate');
await page.screenshot({ path: '.artifacts/design/card-arabic.png', fullPage: true });
console.log('PASS bilingual direction toggle');

for (const asset of [
  '/assets/card/dr-mohamed-el-fadil-print.pdf',
  '/assets/card/dr-mohamed-el-fadil-front.svg',
  '/assets/card/dr-mohamed-el-fadil-back.svg',
  '/assets/Dr_Mohamed_El_Fadil_CV_2026_Redesigned.pdf',
]) {
  const response = await page.request.get(`${base}${asset}`);
  if (!response.ok()) throw new Error(`${asset} unavailable`);
}
console.log('PASS card downloads are reachable');

const png = PNG.sync.read(await readFile('public/assets/card/dr-mohamed-el-fadil-front.png'));
let decoded = jsQR(png.data, png.width, png.height)?.data;
if (!decoded) {
  const crop = new PNG({ width: 360, height: 360 });
  PNG.bitblt(png, crop, 67, 117, 360, 360, 0, 0);
  decoded = jsQR(crop.data, crop.width, crop.height)?.data;
}
if (decoded !== 'https://fadil369.github.io/') throw new Error(`QR decode failed or wrong destination: ${decoded}`);
console.log(`PASS exported QR decodes to ${decoded}`);

if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);
console.log('PASS no browser console or runtime errors');
await browser.close();
