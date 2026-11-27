// standalone.mjs — publish the hand-authored pages that are not part of the React app.
//
// Source lives in standalone/<route>/index.html (English) and, when a page has its own Arabic
// text, standalone/ar/<route>/index.html. Everything else is generated, so the two languages
// cannot drift apart again:
//   - the Arabic twin is written with lang="ar" dir="rtl" in the HTML itself (the page scripts
//     switch their own text to Arabic when the path starts with /ar/);
//   - each output gets canonical, hreflang and share tags, and a bs-page marker so publish.mjs
//     leaves it out of the app's hash-pinned Content Security Policy (these pages use inline
//     handlers that a hash cannot cover).
// publish.mjs calls publishStandalone(); prerender.mjs and verify-published.mjs read STANDALONE.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ORIGIN = 'https://fadil369.github.io';

export const STANDALONE = [
  { route: 'bpr/clinic/encounter', priority: 0.6,
    en: ['ClinicFlow encounter walkthrough — BPR', 'A five-step synthetic-data visit: look up a BPR provider, triage, assessment, medications and a FHIR R4 export. No patient data leaves your browser.'],
    ar: ['مسار زيارة ClinicFlow — BPR', 'زيارة من خمس خطوات ببيانات اصطناعية: البحث عن مقدم رعاية في BPR، الفرز، التقييم، الأدوية وتصدير FHIR R4. لا تغادر أي بيانات متصفحك.'] },
  { route: 'bpr/wizard', priority: 0.6,
    en: ['BPR registration wizard — BrainSAIT Provider Registry', 'Prepare your BPR provider profile step by step: ORCID, profession, licence and credentials. Drafts stay on your device until you submit.'],
    ar: ['معالج التسجيل في BPR — سجل برينسايت لمقدمي الرعاية', 'جهّز ملفك في BPR خطوة بخطوة: ORCID والمهنة والترخيص والاعتمادات. تبقى المسودات على جهازك حتى ترسلها.'] },
  { route: 'bpr/validate', priority: 0.6,
    en: ['FHIR R4 pre-validation — BPR', 'Check a provider FHIR R4 Bundle against BPR and NPHIES-aligned rules on your device before you submit it.'],
    ar: ['التحقق المسبق من FHIR R4 — BPR', 'افحص حزمة FHIR R4 لمقدم الرعاية مقابل قواعد BPR المتوافقة مع نفيس على جهازك قبل إرسالها.'] },
  { route: 'bos', priority: 0.5,
    en: ['BOS — BrainSAIT Back Office System', 'A demo back office for the BPR ecosystem: provider directory, users, audit log and settings, stored only in this browser.'],
    ar: ['BOS — نظام برينسايت للمكتب الخلفي', 'مكتب خلفي تجريبي لمنظومة BPR: دليل مقدمي الرعاية والمستخدمون وسجل التدقيق والإعدادات، محفوظة في هذا المتصفح فقط.'] },
  { route: 'showcase', priority: 0.6,
    en: ['BrainSAIT showcase — BPR · ClinicFlow · BOS', 'The three BrainSAIT flagships in one place: the BPR provider registry, the ClinicFlow reception pilot and the BOS back office.'],
    ar: ['عرض منتجات BrainSAIT — BPR · ClinicFlow · BOS', 'المنتجات الرئيسية الثلاثة في مكان واحد: سجل مقدمي الرعاية BPR، وتجربة الاستقبال ClinicFlow، والمكتب الخلفي BOS.'] },
  { route: 'offline', noindex: true,
    en: ['Offline — BrainSAIT', 'You are offline. Cached pages and local drafts are still available on this device.'],
    ar: ['غير متصل — BrainSAIT', 'أنت غير متصل. الصفحات المحفوظة والمسودات المحلية ما تزال متاحة على هذا الجهاز.'] },
];

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const START = '<!-- standalone:meta -->', END = '<!-- /standalone:meta -->';

function withMeta(html, { lang, path, enPath, arPath, title, description, noindex }) {
  let out = html
    .replace(new RegExp(`\\s*${START}[\\s\\S]*?${END}`), '')
    .replace(/<html\b[^>]*>/, (tag) => tag.replace(/\s(lang|dir)="[^"]*"/g, '').replace('<html', `<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"`))
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/\s*<meta name="description"[^>]*>/, '')
    .replace(/\s*<link rel="(?:canonical|alternate)"[^>]*>/g, '')
    .replace(/\s*<meta (?:property|name)="(?:og|twitter):[^"]*"[^>]*>/g, '');
  const tags = [
    START,
    '<meta name="bs-page" content="standalone">',
    `<meta name="description" content="${esc(description)}">`,
    noindex ? '' : `<link rel="canonical" href="${ORIGIN}${path}">`,
    noindex ? '' : `<link rel="alternate" hreflang="en" href="${ORIGIN}${enPath}">`,
    noindex ? '' : `<link rel="alternate" hreflang="ar" href="${ORIGIN}${arPath}">`,
    noindex ? '' : `<link rel="alternate" hreflang="x-default" href="${ORIGIN}${enPath}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="BrainSAIT">',
    `<meta property="og:locale" content="${lang === 'ar' ? 'ar_SA' : 'en_US'}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${ORIGIN}${path}">`,
    `<meta property="og:image" content="${ORIGIN}/assets/og/bpr.png">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${ORIGIN}/assets/og/bpr.png">`,
    END,
  ].filter(Boolean).join('\n');
  if (!out.includes('</head>')) throw new Error(`${path}: no </head>`);
  return out.replace('</head>', `${tags}\n</head>`);
}

export function publishStandalone(root) {
  const written = [];
  for (const page of STANDALONE) {
    const src = join(root, 'standalone', page.route, 'index.html');
    if (!existsSync(src)) throw new Error(`standalone source missing: ${src}`);
    const enPath = `/${page.route}/`, arPath = `/ar/${page.route}/`;
    const arSrc = join(root, 'standalone', 'ar', page.route, 'index.html');
    const en = readFileSync(src, 'utf8');
    const ar = existsSync(arSrc) ? readFileSync(arSrc, 'utf8') : en;
    for (const [lang, html, path, [title, description]] of [['en', en, enPath, page.en], ['ar', ar, arPath, page.ar]]) {
      const dir = join(root, path);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'index.html'), withMeta(html, { lang, path, enPath, arPath, title, description, noindex: page.noindex }));
      written.push(path);
    }
  }
  return written;
}

// Run directly: node scripts/standalone.mjs
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  console.log(`Published ${publishStandalone(root).length} standalone page(s).`);
}
