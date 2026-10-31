import { mkdir, readFile, writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';
import { chromium } from 'playwright';

const out = new URL('../public/assets/card/', import.meta.url);
await mkdir(out, { recursive: true });
const destination = 'https://fadil369.github.io/';
const qr = await QRCode.toString(destination, {
  type: 'svg', errorCorrectionLevel: 'H', margin: 4, width: 330,
  color: { dark: '#090a08', light: '#edf34a' },
});
const qrBody = qr.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const qrViewBox = qr.match(/viewBox="([^"]+)"/)?.[1];
if (!qrViewBox) throw new Error('QR viewBox was not generated');
const qrInner = `<svg x="82" y="132" width="330" height="330" viewBox="${qrViewBox}" shape-rendering="crispEdges" aria-label="QR code linking to ${destination}">${qrBody}</svg>`;
const brain = `
  <path d="M239 77c-20-29-68-27-83 4-30-20-72-2-74 32-36 3-51 47-29 72-27 27-12 72 20 79-12 37 20 72 54 66 7 37 52 49 77 25 18 30 63 31 83 3 30 24 71 4 73-29 38 4 65-32 50-63 31-18 33-62 5-79 20-31-2-67-33-63-3-35-44-55-73-36-12-28-47-36-70-11Z" fill="#11120e" stroke="#edf34a" stroke-width="5"/>
  <path d="M240 83v52m-85-49c17 8 23 20 21 38M84 119c24-2 40 10 43 29M57 188c23-9 42-1 51 18m-31 60c23 4 35-6 43-22m8 87c-2-24 12-37 30-40m47 63c-14-18-12-37 2-51m80 53c-20-9-27-25-22-44m94 14c-25 2-38-10-42-29m91-29c-23 9-43 0-50-20m55-55c-25 7-43-3-49-23m8-51c-22 14-43 8-54-9" fill="none" stroke="#edf34a" stroke-width="4" stroke-linecap="round" opacity=".72"/>`;
const front = `<svg xmlns="http://www.w3.org/2000/svg" width="1050" height="600" viewBox="0 0 1050 600" role="img" aria-labelledby="title desc">
<title id="title">Dr. Mohamed El Fadil — brain-framed profile QR</title><desc id="desc">Black and lemon business card front. Scan the valid QR code to open https://fadil369.github.io/</desc>
<rect width="1050" height="600" fill="#090a08"/><path d="M0 0h1050v12H0z" fill="#edf34a"/>
${brain}<rect x="67" y="117" width="360" height="360" fill="#edf34a"/>${qrInner}
<g font-family="Arial, Helvetica, sans-serif"><text x="500" y="172" fill="#edf34a" font-size="14" font-weight="700" letter-spacing="4">BPR / BRAINSAIT</text>
<text x="496" y="249" fill="#f4f3e9" font-size="48" font-weight="700" letter-spacing="-2">Dr. Mohamed</text><text x="496" y="307" fill="#f4f3e9" font-size="48" font-weight="700" letter-spacing="-2">El Fadil</text>
<path d="M500 341h70" stroke="#edf34a" stroke-width="4"/><text x="500" y="382" fill="#c2c2b6" font-size="17">Physician · Founder · Healthcare builder</text>
<text x="500" y="468" fill="#edf34a" font-size="15" font-weight="700" letter-spacing="1">SCAN THE BRAIN. OPEN THE PROFILE.</text>
<text x="500" y="502" fill="#f4f3e9" font-size="18">fadil369.github.io</text></g>
<text x="1000" y="570" text-anchor="end" fill="#77786d" font-family="monospace" font-size="11">SA-PHY-000003</text></svg>`;
const back = `<svg xmlns="http://www.w3.org/2000/svg" width="1050" height="600" viewBox="0 0 1050 600" role="img" aria-labelledby="title desc">
<title id="title">Dr. Mohamed El Fadil — RCM, Healthcare Intelligent Improvement Advisor</title><desc id="desc">Professional black and lemon business card back</desc>
<rect width="1050" height="600" fill="#edf34a"/><rect x="22" y="22" width="1006" height="556" fill="#090a08"/>
<path d="M780 22h248v556H735z" fill="#edf34a"/><path d="m790 22-55 556" stroke="#f4f3e9" stroke-opacity=".18"/>
<g font-family="Arial, Helvetica, sans-serif"><text x="75" y="92" fill="#edf34a" font-size="13" font-weight="700" letter-spacing="4">BPR / BRAINSAIT · RIYADH</text>
<text x="70" y="204" fill="#f4f3e9" font-size="58" font-weight="700" letter-spacing="-2">Dr. Mohamed</text><text x="70" y="272" fill="#f4f3e9" font-size="58" font-weight="700" letter-spacing="-2">El Fadil</text>
<path d="M75 316h610" stroke="#edf34a" stroke-width="2"/><text x="75" y="367" fill="#f4f3e9" font-size="25" font-weight="700">RCM, Healthcare Intelligent</text><text x="75" y="405" fill="#f4f3e9" font-size="25" font-weight="700">Improvement Advisor</text>
<text x="75" y="510" fill="#aaa99d" font-size="16">elfadil369@icloud.com</text><text x="445" y="510" fill="#aaa99d" font-size="16">+966 543 560 672</text>
<g transform="translate(837 178) rotate(90)"><text fill="#090a08" font-size="20" font-weight="700" letter-spacing="5">IDENTITY → INTELLIGENCE</text></g>
<text x="965" y="502" text-anchor="end" fill="#090a08" font-size="52" font-weight="800" letter-spacing="-4">EF</text></g></svg>`;
await Promise.all([
  writeFile(new URL('dr-mohamed-el-fadil-front.svg', out), front),
  writeFile(new URL('dr-mohamed-el-fadil-back.svg', out), back),
  writeFile(new URL('profile-qr.svg', out), qr),
]);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1050, height: 600 }, deviceScaleFactor: 1 });
for (const side of ['front', 'back']) {
  const file = `dr-mohamed-el-fadil-${side}`;
  const svg = await readFile(new URL(`${file}.svg`, out), 'utf8');
  await page.setContent(`<style>*{margin:0}html,body{width:1050px;height:600px;overflow:hidden}svg{display:block}</style>${svg}`);
  await page.screenshot({ path: new URL(`${file}.png`, out).pathname });
}
const frontUri = `data:image/svg+xml;base64,${Buffer.from(front).toString('base64')}`;
const backUri = `data:image/svg+xml;base64,${Buffer.from(back).toString('base64')}`;
await page.setContent(`<style>@page{size:3.5in 2in;margin:0}*{box-sizing:border-box}html,body{margin:0}.sheet{width:3.5in;height:2in;break-after:page}.sheet:last-child{break-after:auto}img{display:block;width:100%;height:100%}</style><div class="sheet"><img src="${frontUri}"></div><div class="sheet"><img src="${backUri}"></div>`);
await page.pdf({ path: new URL('dr-mohamed-el-fadil-print.pdf', out).pathname, width: '3.5in', height: '2in', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
await browser.close();
console.log('Generated brain-framed QR, two-sided SVG/PNG card artwork, and print PDF.');
