// publish.mjs — copy built output to repo root so `git push` deploys to
// fadil369.github.io via GitHub Pages (matches the original deploy layout).
// The build entry lives at src/index.html, so the built HTML is at
// dist/src/index.html; it is flattened to the repo root here.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
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
// Note: the repo-root index.html (and ar/index.html) are hand-crafted landing
// pages and must NOT be overwritten by the build output.
// Only copy to SPA fallback routes (cv, card, bpr/*, slots) that need the shell.

for (const route of ['profile', 'cv', 'card', 'slots',
  'bpr', 'bpr/ai', 'bpr/providers', 'bpr/verify', 'bpr/ledger', 'bpr/research', 'bpr/developers', 'bpr/status', 'bpr/join', 'bpr/workspace', 'bpr/record', 'bpr/saudi', 'bpr/nphies', 'bpr/clinic']) {
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
  const shell = index.replace(SHELL_META, '').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '').replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(description)}" />`).replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${esc(url)}" />`);
  return shell.replace(/[ \t]+\n/g, '\n').replace('</head>', `    ${tags}\n  </head>`);
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
  profile: ['Dr. Mohamed El Fadil — Physician & Healthcare AI Founder', 'Physician and BrainSAIT founder in Riyadh, building verifiable healthcare identity and interoperable clinical tools.', '/assets/profile-og.png'],
  cv: ['Professional CV — Dr. Mohamed El Fadil', 'Physician, BrainSAIT founder, RCM & Healthcare Intelligent Improvement Advisor. One-page A4 CV with a live BPR verification QR.', '/assets/profile-og.png'],
  card: ['Business card — Dr. Mohamed El Fadil', 'Black and lemon business card with a brain-framed QR code. Print-ready PDF.', '/assets/card/dr-mohamed-el-fadil-front.png'],
  slots: ['Hospital slots — BPR', 'The BPR hospital slots marketplace: hospitals publish openings and verified providers request them with a BPR ID. Launching soon.'],
  bpr: ['BPR — BrainSAIT Provider Registry', 'Signed identity for every clinician: directory, on-device verification, transparency log, research footprint and FHIR R4.'],
  'bpr/ai': ['AI and model gateway — BPR', 'Copilot service checks, a dated private model catalog snapshot and explicit connection boundaries.'],
  'bpr/workspace': ['Provider workspace — BPR', 'Own OpenEMR, a clinical copilot with Arabic dictation, FHIR, specialty tools and research — live and planned features stated per card.'],
  'bpr/providers': ['Provider directory — BPR', 'Listed providers with every trust dimension shown separately.'],
  'bpr/verify': ['Verify a provider — BPR', 'Check a BPR signed credential on your device: signature, validity window and live status.'],
  'bpr/ledger': ['Transparency log — BPR', 'Every credential issue, renewal and revocation in a public hash chain your browser replays.'],
  'bpr/research': ['Research footprint — BPR', 'Provider works matched by DOI across ORCID, Zenodo and Hugging Face.'],
  'bpr/developers': ['FHIR R4 & public API — BPR', 'FHIR resources, the public JSON API and an embeddable live check.'],
  'bpr/status': ['Operations status — BPR', 'The registry’s own health verdict, failures included.'],
  'bpr/join': ['Join BPR', 'From ORCID sign-in to a signed credential.'],
  'bpr/nphies': ['NPHIES desk: rejection codes, pre-check and readiness — BPR', 'Every official NPHIES rejection code in plain Arabic and English, a message pre-check that runs on your device, and a readiness plan by facility type.'],
  'bpr/clinic': ['Clinic Reception — BPR', 'A synthetic-data reception pilot with separate BPR credential checks and integration status.'],
  'bpr/saudi': ['BPR across the Saudi health system', 'Where the BrainSAIT Provider Registry could serve Saudi health organisations — proposals, with what runs today and what each depends on.'],
  'bpr/record': ['Dr. Mohamed El Fadil · BPR record SA-PHY-000003', 'A signed provider record, checked live in your browser: signature, validity, status, transparency log and research footprint.', '/assets/og/SA-PHY-000003.png'],
};
for (const [route, [title, description, image]] of Object.entries(ROUTE_META)) {
  writeFileSync(join(root, route, 'index.html'), deepRouteHtml({ title, description, image: `${ORIGIN}${image || '/assets/og/bpr.png'}`, url: `${ORIGIN}/${route}/` }).replace('content="product"', 'content="website"'));
}
console.log(`Wrote share tags for ${Object.keys(ROUTE_META).length} static route(s).`);


for (const f of ['manifest.webmanifest', 'llms.txt']) {
  const src = join(dist, f);
  if (existsSync(src)) cpSync(src, join(root, f));
}
for (const f of ['assets']) {
  const src = join(dist, f), dst = join(root, f);
  // Retain previous hashed chunks for open tabs updating across releases.
  cpSync(src, dst, { recursive: true });
}
// ── Arabic twins (/ar/...) ──────────────────────────────────────────────────
// Every page also exists under /ar with lang="ar" dir="rtl" in the HTML itself and Arabic share
// tags; the app reads the language from the URL. prerender.mjs then fills in Arabic content.
const AR_META = {
  '': ['د. محمد الفاضل — طبيب ومؤسس BrainSAIT', 'طبيب ومؤسس BrainSAIT في الرياض. أبني هوية صحية قابلة للتحقق وأدوات مترابطة للممارسين عبر FHIR ونفيس والذكاء الاصطناعي.'],
  profile: ['د. محمد الفاضل — طبيب ومؤسس BrainSAIT', 'طبيب ومؤسس BrainSAIT في الرياض، يبني هوية صحية قابلة للتحقق وأدوات سريرية مترابطة.'],
  cv: ['السيرة الذاتية — د. محمد الفاضل', 'طبيب ومؤسس BrainSAIT ومستشار تحسين ذكي للرعاية الصحية ودورة الإيرادات. سيرة ذاتية بصفحة A4 واحدة مع رمز تحقق BPR مباشر.'],
  card: ['بطاقة الأعمال — د. محمد الفاضل', 'بطاقة أعمال سوداء وليمونية برمز QR على شكل دماغ. ملف PDF جاهز للطباعة.'],
  slots: ['شواغر المستشفيات — BPR', 'سوق شواغر المستشفيات في BPR: تنشر المستشفيات فتراتها، ويطلبها مقدمو الرعاية الموثّقون بمعرّف BPR. ينطلق قريبًا.'],
  bpr: ['BPR — سجل برينسايت لمقدمي الرعاية', 'هوية موقّعة لكل ممارس صحي: دليل، تحقق على الجهاز، سجل شفاف، بصمة بحثية وFHIR R4.'],
  'bpr/ai': ['الذكاء الاصطناعي وبوابة النماذج — BPR', 'فحوص خدمة المساعد ولقطة مؤرخة لفهرس النماذج الخاص وحدود اتصال واضحة.'],
  'bpr/workspace': ['مساحة عمل مقدم الرعاية — BPR', 'OpenEMR خاص، مساعد سريري بإملاء عربي، FHIR، أدوات التخصص والبحث — مع بيان ما يعمل وما هو مخطط لكل ميزة.'],
  'bpr/providers': ['دليل مقدمي الرعاية — BPR', 'مقدمو الرعاية المدرجون مع عرض كل بُعد للثقة بشكل منفصل.'],
  'bpr/verify': ['التحقق من مقدم رعاية — BPR', 'تحقق من اعتماد BPR الموقّع على جهازك: التوقيع والصلاحية والحالة المباشرة.'],
  'bpr/ledger': ['السجل الشفاف — BPR', 'كل إصدار وتجديد وإلغاء لاعتمادات BPR في سلسلة تجزئة عامة يعيد متصفحك التحقق منها.'],
  'bpr/research': ['البصمة البحثية — BPR', 'أعمال مقدمي الرعاية مطابقة عبر DOI من ORCID وZenodo وHugging Face.'],
  'bpr/developers': ['FHIR والواجهة العامة — BPR', 'موارد FHIR R4 وواجهة JSON عامة وبطاقة تحقق قابلة للتضمين.'],
  'bpr/status': ['حالة التشغيل — BPR', 'حكم السجل على صحته، بما في ذلك الإخفاقات.'],
  'bpr/join': ['انضم إلى BPR', 'من تسجيل الدخول عبر ORCID إلى اعتماد موقّع.'],
  'bpr/nphies': ['مكتب نفيس: رموز الرفض والفحص والجاهزية — BPR', 'كل رموز رفض نفيس الرسمية بعربية وإنجليزية واضحتين، وفحص أولي للرسائل يعمل على جهازك، وخطة جاهزية حسب نوع المنشأة.'],
  'bpr/clinic': ['استقبال العيادات — BPR', 'تجربة استقبال ببيانات اصطناعية، مع تحقق مستقل من هوية BPR وحالة التكامل.'],
  'bpr/saudi': ['BPR في المنظومة الصحية السعودية', 'أين يمكن أن يخدم سجل برينسايت الجهات الصحية السعودية — مقترحات، مع بيان ما يعمل اليوم وما يعتمد عليه كل تكامل.'],
  'bpr/record': ['د. محمد الفاضل · سجل BPR SA-PHY-000003', 'سجل مقدم رعاية موقّع يُتحقق منه مباشرة في متصفحك: التوقيع والصلاحية والحالة والسجل الشفاف والبصمة البحثية.'],
};
const toArabic = (html, route, meta) => {
  let out = html.replace(/<html lang="en" dir="ltr"/, '<html lang="ar" dir="rtl"')
    .replace(/(<link rel="canonical" href=")https:\/\/fadil369\.github\.io\//g, '$1https://fadil369.github.io/ar/')
    .replace(/(<meta property="og:url" content=")https:\/\/fadil369\.github\.io\//g, '$1https://fadil369.github.io/ar/');
  if (meta) {
    const [title, desc] = meta;
    out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
      .replace(/(<meta (?:property|name)="(?:og:title|twitter:title)" content=")[^"]*"/g, `$1${esc(title)}"`)
      .replace(/(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]*"/g, `$1${esc(desc)}"`);
  }
  return out;
};
let arWritten = 0;
const arPages = ['profile', 'cv', 'card', 'slots', 'bpr', 'bpr/providers', 'bpr/verify', 'bpr/ledger', 'bpr/research', 'bpr/developers', 'bpr/status', 'bpr/join', 'bpr/workspace', 'bpr/record', 'bpr/saudi', 'bpr/nphies', 'bpr/clinic'].map((r) => [r, join(root, r, 'index.html')]);
if (existsSync(snapList)) {
  for (const p of JSON.parse(readFileSync(snapList, 'utf8')).items || []) {
    if (!/^SA-[A-Z]{2,4}-\d{6}$/.test(p.spid)) continue;
    AR_META[`bpr/p/${p.spid}`] = [`${p.name_ar} · ${p.spid} — BPR`, p.trust_summary_ar || ''];
    arPages.push([`bpr/p/${p.spid}`, join(root, 'bpr', 'p', p.spid, 'index.html')], [`bpr/embed/${p.spid}`, join(root, 'bpr', 'embed', p.spid, 'index.html')]);
    if (p.research_url) { AR_META[`bpr/research/${p.spid}`] = [`البصمة البحثية · ${p.name_ar} — BPR`, 'أعمال مطابقة عبر DOI من ORCID وZenodo وHugging Face.']; arPages.push([`bpr/research/${p.spid}`, join(root, 'bpr', 'research', p.spid, 'index.html')]); }
  }
}
for (const [route, src] of arPages) {
  if (!existsSync(src)) continue;
  const dir = join(root, 'ar', route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), toArabic(readFileSync(src, 'utf8'), route, AR_META[route]));
  arWritten += 1;
}
console.log(`Wrote ${arWritten} Arabic page(s) under /ar/.`);

// ── legacy store routes → static redirect stubs ────────────────────────────
// Old storefront URLs keep working for people with bookmarks, but are not indexable duplicates.
const LEGACY = { 'bpr/nvidia': '/bpr/ai/', id: '/bpr/record/', learn: '/bpr/', build: '/bpr/', solutions: '/bpr/', templates: '/bpr/', oid: '/bpr/', catalogue: '/bpr/', store: '/bpr/', 'products/bpr': '/bpr/',
  doctors: '/bpr/providers/', sprint: '/bpr/workspace/', benefits: '/bpr/join/', account: '/', track: '/', faq: '/', terms: '/', support: '/#contact', contact: '/#contact' };
for (const [route, to] of Object.entries(LEGACY)) {
  const dir = join(root, route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Moved</title>
<meta name="robots" content="noindex, follow"><link rel="canonical" href="${ORIGIN}${to}"><meta http-equiv="refresh" content="0; url=${to}">
</head><body><p>This page moved to <a href="${to}">${ORIGIN}${to}</a>.</p></body></html>
`);
  if (route === 'bpr/nvidia') {
    const arDir = join(root, 'ar', route);
    mkdirSync(arDir, { recursive: true });
    const arTarget = '/ar' + to;
    writeFileSync(join(arDir, 'index.html'), `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="robots" content="noindex, follow"><title>تم نقل الصفحة</title><link rel="canonical" href="${ORIGIN}${arTarget}"><meta http-equiv="refresh" content="0; url=${arTarget}"></head><body><p>نُقلت هذه الصفحة إلى <a href="${arTarget}">${arTarget}</a>.</p></body></html>\n`);
  }
}
// Old storefront product pages pointed at bundles that no longer exist (they rendered blank).
const productsDir = join(root, 'products');
let productStubs = 0;
if (existsSync(productsDir)) for (const slug of readdirSync(productsDir)) {
  if (slug === 'bpr' || !existsSync(join(productsDir, slug, 'index.html'))) continue;
  writeFileSync(join(productsDir, slug, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Moved</title>
<meta name="robots" content="noindex, follow"><link rel="canonical" href="${ORIGIN}/bpr/"><meta http-equiv="refresh" content="0; url=/bpr/">
</head><body><p>The BrainSAIT store moved. See <a href="/bpr/">${ORIGIN}/bpr/</a>.</p></body></html>
`);
  productStubs += 1;
}
console.log(`Wrote ${Object.keys(LEGACY).length} legacy redirect stub(s) and ${productStubs} product stub(s).`);

// ── Content Security Policy for the BPR pages (no analytics there) ──────────
// Inline scripts are pinned by hash; links can only open http(s); only the registry is reachable.
{
  const { createHash } = await import('node:crypto');
  const hashes = [...index.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);
  const csp = ["default-src 'self'", `script-src 'self' ${hashes.join(' ')}`, "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:", "connect-src 'self' https://registry.brainsait.de", "frame-src 'self'", "worker-src 'self'", "manifest-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"].join('; ');
  const walkHtml = (dir) => existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? walkHtml(join(dir, d.name)) : d.name === 'index.html' ? [join(dir, d.name)] : []) : [];
  let n = 0;
  for (const f of [...walkHtml(join(root, 'bpr')), ...walkHtml(join(root, 'ar', 'bpr'))]) {
    const h = readFileSync(f, 'utf8').replace(/\s*<meta http-equiv="Content-Security-Policy"[^>]*>/, '');
    writeFileSync(f, h.replace(/<head>/, `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`));
    n += 1;
  }
  console.log(`CSP on ${n} BPR page(s) (${hashes.length} inline script hash(es)).`);
}

// ── service worker (offline + resilience) ───────────────────────────────────
// Versioned by the hashed entry bundle, so every deploy replaces the old cache.
// Same-origin only: registry calls, fonts and analytics are never intercepted.
{
  const entry = (index.match(/assets\/index-[^"]+\.js/) || ['dev'])[0];
  const css = [...index.matchAll(/assets\/index-[^"]+\.css/g)].map((m) => '/' + m[0]);
  const { createHash } = await import('node:crypto');
  const version = createHash('sha256').update(index + readFileSync(join(root, 'index.html')) + readFileSync(join(root, 'ar/index.html')) + readFileSync(join(root, 'assets/launchpad/landing.js')) + readFileSync(join(root, 'assets/launchpad/landing.css')) + readFileSync(join(root, 'public/assets/bpr-data/manifest.json'))).digest('hex').slice(0, 12);
  // Every code chunk of this build (≈0.7 MB) and the whole registry snapshot (≈0.1 MB), so any page
  // opens offline after one visit, not only the pages already viewed.
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]);
  const chunks = readdirSync(join(dist, 'assets')).filter((f) => /\.(js|css)$/.test(f)).map((f) => '/assets/' + f);
  // The NPHIES tables load on demand and are cached at runtime, so a first visit stays light.
  const data = walk(join(dist, 'assets', 'bpr-data')).map((f) => '/' + relative(dist, f).split(sep).join('/')).filter((u) => !u.startsWith('/assets/bpr-data/nphies/'));
  const enPages = ['/', '/profile/', '/bpr/clinic/', '/cv/', '/card/', '/slots/', '/bpr/', '/bpr/verify/', '/bpr/workspace/', '/bpr/ai/', '/bpr/providers/', '/bpr/ledger/', '/bpr/research/', '/bpr/developers/', '/bpr/status/', '/bpr/join/', '/bpr/record/', '/bpr/saudi/', '/bpr/nphies/'];
  const pages = [...enPages, ...enPages.map((p) => '/ar' + p)];
  const precache = [...new Set([...pages, '/' + entry, ...css, ...chunks, ...data, '/assets/launchpad/landing.css', '/assets/launchpad/landing.js', '/assets/img/prof_pic.jpg', '/manifest.webmanifest', '/assets/icons/icon-192.png'])];
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
    if (res && res.ok) await cache.put(req, res.clone());
    if (!res || res.status >= 500) throw new Error('upstream unavailable');
    return res;
  } catch {
    return (await cache.match(req, { ignoreSearch: req.mode === 'navigate' })) || (req.mode === 'navigate' ? (await cache.match(new URL(req.url).pathname.startsWith('/ar/') ? '/ar/' : '/')) : undefined) || Response.error();
  }
}
async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) await cache.put(req, res.clone());
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
