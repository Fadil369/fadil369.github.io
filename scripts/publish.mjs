// publish.mjs — copy built output to repo root so `git push` deploys to
// fadil369.github.io via GitHub Pages (matches the original deploy layout).
// The build entry lives at src/index.html, so the built HTML is at
// dist/src/index.html; it is flattened to the repo root here.
import { cpSync, rmSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = dirname(scriptDir); // repo root = parent of /scripts
const dist = join(root, 'dist');
const built = join(dist, 'src', 'index.html');
const fallback = join(dist, 'index.html');

const indexFile = existsSync(built) ? built : fallback;
if (!existsSync(indexFile)) {
  console.error('No built index.html — run `npm run build` first. Checked:', indexFile);
  process.exit(1);
}

const index = readFileSync(indexFile, 'utf8');
writeFileSync(join(root, '404.html'), index); // SPA fallback for hard refresh
writeFileSync(join(root, 'index.html'), index);

for (const route of ['learn', 'build', 'solutions', 'templates', 'oid', 'catalogue', 'store', 'sprint', 'benefits', 'account', 'track', 'faq', 'terms', 'support', 'contact', 'slots', 'doctors', 'cv', 'card',
  'bpr', 'bpr/providers', 'bpr/verify', 'bpr/ledger', 'bpr/research', 'bpr/developers', 'bpr/status', 'bpr/join', 'bpr/workspace']) {
  const routeDir = join(root, route);
  mkdirSync(routeDir, { recursive: true });
  writeFileSync(join(routeDir, 'index.html'), index);
}


// ── deep routes (R6) ────────────────────────────────────────────────────────
// /products/:slug and /doctors/:spid are SPA routes, so a shared link used to
// return HTTP 404 with the SPA body: every product link previewed as broken on
// LinkedIn, Telegram and WhatsApp even though clicking through worked. Emit one
// real file per entity, carrying entity-specific Open Graph tags so previews
// render, while the app itself still hydrates from the same shell.
const catalogPath = join(root, 'src', 'data', 'catalog.json');
const ORIGIN = 'https://fadil369.github.io';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SHELL_META = /\s*<meta\s+(?:property|name)=["'](?:og:|twitter:)[^>]*>|<title>[\s\S]*?<\/title>/gi;

function deepRouteHtml({ title, description, image, url }) {
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta property="og:type" content="product" />`,
    `<meta property="og:site_name" content="BrainSAIT" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    image ? `<meta property="og:image" content="${esc(image)}" />` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    image ? `<meta name="twitter:image" content="${esc(image)}" />` : '',
  ].filter(Boolean).join('\n    ');
  const shell = index.replace(SHELL_META, '');
  return shell.replace('</head>', `    ${tags}\n  </head>`);
}

let deepWritten = 0;
if (existsSync(catalogPath)) {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const items = [
    ...(catalog.learn ?? []), ...(catalog.solutions ?? []),
    ...(catalog.templates ?? []), ...(catalog.oid ?? []),
    ...((catalog.build ?? {}).courses ?? []),
    ...(catalog.catalogue ?? []),
  ].filter((i) => i && typeof i === 'object' && i.slug === 'bpr');

  for (const item of items) {
    const dir = join(root, 'products', item.slug);
    mkdirSync(dir, { recursive: true });
    const name = item.nameAr || item.name || item.slug;
    const blurb = item.tagline || item.description || item.taglineAr || item.descriptionAr || '';
    writeFileSync(join(dir, 'index.html'), deepRouteHtml({
      title: `${name} — BrainSAIT`,
      description: String(blurb).slice(0, 200),
      image: item.image ? (item.image.startsWith('http') ? item.image : `${ORIGIN}${item.image}`) : null,
      url: `${ORIGIN}/products/${item.slug}/`,
    }));
    deepWritten += 1;
  }
  console.log(`Pre-rendered ${deepWritten} product deep route(s).`);
}

// BPR provider pages: one real file per listed provider (from the build snapshot), with
// provider-specific share tags, so /bpr/p/{SPID} and /bpr/research/{SPID} return 200.
const snapDir = join(root, 'public', 'assets', 'bpr-data');
const snapList = join(snapDir, 'providers.json');
let bprWritten = 0;
if (existsSync(snapList)) {
  const { items = [] } = JSON.parse(readFileSync(snapList, 'utf8'));
  for (const p of items) {
    if (!/^SA-[A-Z]{2,4}-\d{6}$/.test(p.spid)) continue;
    const page = (path, title, description) => {
      const dir = join(root, path);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'index.html'), deepRouteHtml({ title, description, image: `${ORIGIN}/assets/og/${p.spid}.png`, url: `${ORIGIN}/${path}/` }).replace('content="product"', 'content="profile"'));
      bprWritten += 1;
    };
    page(`bpr/p/${p.spid}`, `${p.name_en} · ${p.spid} — BPR`, p.trust_summary || 'BrainSAIT Provider Registry profile');
    page(`bpr/embed/${p.spid}`, `${p.name_en} · ${p.spid} — BPR live check`, p.trust_summary || 'Live BPR provider check');
    if (p.research_url) page(`bpr/research/${p.spid}`, `Research footprint · ${p.name_en} — BPR`, 'Works matched by DOI across ORCID, Zenodo and Hugging Face.');
  }
}
console.log(`Pre-rendered ${bprWritten} BPR provider route(s).`);

// Static pages with their own title and share image instead of the home page's.
const ROUTE_META = {
  cv: ['Professional CV — Dr. Mohamed El Fadil', 'Physician, BrainSAIT founder, RCM & Healthcare Intelligent Improvement Advisor. One-page A4 CV with a live BPR verification QR.', '/assets/profile-og.png'],
  card: ['Business card — Dr. Mohamed El Fadil', 'Black and lemon business card with a brain-framed QR code. Print-ready PDF.', '/assets/card/dr-mohamed-el-fadil-front.png'],
  bpr: ['BPR — BrainSAIT Provider Registry', 'Signed identity for every clinician: directory, on-device verification, transparency log, research footprint and FHIR R4.'],
  'bpr/workspace': ['Provider workspace — BPR', 'Own OpenEMR, a clinical copilot with Arabic dictation, FHIR, specialty tools and research — live and planned features stated per card.'],
  'bpr/providers': ['Provider directory — BPR', 'Listed providers with every trust dimension shown separately.'],
  'bpr/verify': ['Verify a provider — BPR', 'Check a BPR signed credential on your device: signature, validity window and live status.'],
  'bpr/ledger': ['Transparency log — BPR', 'Every credential issue, renewal and revocation in a public hash chain your browser replays.'],
  'bpr/research': ['Research footprint — BPR', 'Provider works matched by DOI across ORCID, Zenodo and Hugging Face.'],
  'bpr/developers': ['FHIR R4 & public API — BPR', 'FHIR resources, the public JSON API and an embeddable live check.'],
  'bpr/status': ['Operations status — BPR', 'The registry’s own health verdict, failures included.'],
  'bpr/join': ['Join BPR', 'From ORCID sign-in to a signed credential.'],
};
for (const [route, [title, description, image]] of Object.entries(ROUTE_META)) {
  writeFileSync(join(root, route, 'index.html'), deepRouteHtml({ title, description, image: `${ORIGIN}${image || '/assets/og/bpr.png'}`, url: `${ORIGIN}/${route}/` }).replace('content="product"', 'content="website"'));
}
console.log(`Wrote share tags for ${Object.keys(ROUTE_META).length} static route(s).`);

const bprRoute = join(root, 'products', 'bpr');
mkdirSync(bprRoute, { recursive: true });
writeFileSync(join(bprRoute, 'index.html'), index);

for (const f of ['manifest.webmanifest', 'llms.txt']) {
  const src = join(dist, f);
  if (existsSync(src)) cpSync(src, join(root, f));
}
for (const f of ['assets']) {
  const src = join(dist, f), dst = join(root, f);
  if (existsSync(dst)) rmSync(dst, { recursive: true, force: true });
  cpSync(src, dst, { recursive: true });
}
// ── service worker (offline + resilience) ───────────────────────────────────
// Versioned by the hashed entry bundle, so every deploy replaces the old cache.
// Same-origin only: registry calls, fonts and analytics are never intercepted.
{
  const entry = (index.match(/assets\/index-[^"]+\.js/) || ['dev'])[0];
  const css = [...index.matchAll(/assets\/index-[^"]+\.css/g)].map((m) => '/' + m[0]);
  const version = entry.replace(/^assets\/index-|\.js$/g, '');
  // Every code chunk of this build (≈0.7 MB) and the whole registry snapshot (≈0.1 MB), so any page
  // opens offline after one visit, not only the pages already viewed.
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]);
  const chunks = readdirSync(join(dist, 'assets')).filter((f) => /\.(js|css)$/.test(f)).map((f) => '/assets/' + f);
  const data = walk(join(dist, 'assets', 'bpr-data')).map((f) => '/' + relative(dist, f).split(sep).join('/'));
  const pages = ['/', '/cv/', '/card/', '/bpr/', '/bpr/verify/', '/bpr/workspace/', '/bpr/providers/', '/bpr/ledger/', '/bpr/research/', '/bpr/developers/', '/bpr/status/', '/bpr/join/'];
  const precache = [...new Set([...pages, '/' + entry, ...css, ...chunks, ...data, '/manifest.webmanifest', '/assets/icons/icon-192.png'])];
  const sw = `// generated by scripts/publish.mjs — do not edit
const VERSION = '${version}';
const CACHE = 'ef-' + VERSION;
const PRECACHE = ${JSON.stringify(precache)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(new Request(u, { cache: 'reload' }))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('ef-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
async function networkFirst(req, ms) {
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([fetch(req), timeout(ms)]);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req, { ignoreSearch: req.mode === 'navigate' })) || (req.mode === 'navigate' ? (await cache.match('/')) : undefined) || Response.error();
  }
}
async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') return e.respondWith(networkFirst(req, 4000));
  if (url.pathname.startsWith('/assets/bpr-data/')) return e.respondWith(networkFirst(req, 4000));
  if (/^\\/assets\\/.+-[A-Za-z0-9_-]{8}\\.(js|css)$/.test(url.pathname)) return e.respondWith(cacheFirst(req));
  if (url.pathname.startsWith('/assets/')) return e.respondWith(networkFirst(req, 6000));
});
`;
  writeFileSync(join(root, 'sw.js'), sw);
  console.log(`Service worker ${version}: ${precache.length} precached URL(s).`);
}

console.log('Published dist/ -> repo root. Commit & push to deploy.');
