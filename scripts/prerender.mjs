// prerender.mjs — make every page readable without JavaScript: crawlers, AI agents, no-JS users.
//
// Runs after publish.mjs. Renders each route in Chromium (analytics blocked, registry live, falling
// back to the snapshot as the app does), then writes into that route's index.html:
//   - the rendered page inside <noscript> after #root — raw-HTML readers get the full text, no-JS
//     visitors get a styled page, and JS visitors see no change (React renders into #root as before);
//   - the page's own <title>, description and canonical, plus route-specific JSON-LD.
// Also writes sitemap.xml, robots.txt and llms.txt (the agent entry point) from the same route list.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { serve } from './lib-serve.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const ORIGIN = 'https://fadil369.github.io';
const REGISTRY = 'https://registry.brainsait.de';
const OWNER_SPID = 'SA-PHY-000003';
const snapFile = join(root, 'public', 'assets', 'bpr-data', 'providers.json');
const providers = existsSync(snapFile) ? (JSON.parse(readFileSync(snapFile, 'utf8')).items || []).filter((p) => /^SA-[A-Z]{2,4}-\d{6}$/.test(p.spid)) : [];

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const today = new Date().toISOString().slice(0, 10);

const person = {
  '@type': 'Person', '@id': `${ORIGIN}/#person`, name: 'Dr. Mohamed El Fadil', alternateName: 'د. محمد الفاضل',
  jobTitle: 'Physician · Founder & CEO, BrainSAIT · RCM, Healthcare Intelligent Improvement Advisor',
  image: `${ORIGIN}/assets/img/prof_pic.jpg`, url: `${ORIGIN}/`,
  address: { '@type': 'PostalAddress', addressLocality: 'Riyadh', addressCountry: 'SA' },
  alumniOf: { '@type': 'CollegeOrUniversity', name: 'International University of Africa' },
  worksFor: { '@type': 'Organization', '@id': `${ORIGIN}/#brainsait`, name: 'BrainSAIT', url: 'https://brainsait.de' },
  knowsAbout: ['Healthcare AI', 'HL7 FHIR', 'NPHIES', 'Revenue cycle management', 'Provider identity', 'Critical care'],
  identifier: { '@type': 'PropertyValue', propertyID: 'BPR SPID', value: OWNER_SPID, url: `${ORIGIN}/bpr/p/${OWNER_SPID}` },
  sameAs: ['https://orcid.org/0009-0003-7485-3575', 'https://github.com/Fadil369', 'https://sa.linkedin.com/in/fadil369', 'https://elfadil.brainsait.de/', `${REGISTRY}/p/${OWNER_SPID}`],
};
const registryOrg = { '@type': 'Organization', '@id': `${ORIGIN}/bpr#registry`, name: 'BrainSAIT Provider Registry', alternateName: 'BPR', url: `${ORIGIN}/bpr`, sameAs: [REGISTRY], parentOrganization: { '@id': `${ORIGIN}/#brainsait` } };
const crumbs = (items) => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${ORIGIN}${path}` })) });
const page = (type, path, name, extra = {}) => ({ '@type': type, '@id': `${ORIGIN}${path}#page`, url: `${ORIGIN}${path}`, name, inLanguage: ['en', 'ar'], isPartOf: { '@type': 'WebSite', '@id': `${ORIGIN}/#site`, name: 'Dr. Mohamed El Fadil · BPR', url: `${ORIGIN}/` }, ...extra });

// path, JSON-LD graph, sitemap priority
const ROUTES = [
  ['/', [page('ProfilePage', '/', 'Dr. Mohamed El Fadil', { mainEntity: { '@id': `${ORIGIN}/#person` } }), person], 1.0],
  ['/cv/', [page('ProfilePage', '/cv/', 'Professional CV — Dr. Mohamed El Fadil', { mainEntity: { '@id': `${ORIGIN}/#person` } }), person], 0.9],
  ['/card/', [page('WebPage', '/card/', 'Business card — Dr. Mohamed El Fadil', { about: { '@id': `${ORIGIN}/#person` } })], 0.5],
  ['/bpr/', [page('WebPage', '/bpr/', 'BPR — BrainSAIT Provider Registry', { about: { '@id': `${ORIGIN}/bpr#registry` } }), registryOrg], 0.9],
  ['/bpr/workspace/', [page('WebPage', '/bpr/workspace/', 'Provider workspace — BPR'), crumbs([['BPR', '/bpr/'], ['Workspace', '/bpr/workspace/']])], 0.8],
  ['/bpr/providers/', [page('CollectionPage', '/bpr/providers/', 'Provider directory — BPR', {
    mainEntity: { '@type': 'ItemList', numberOfItems: providers.length, itemListElement: providers.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${ORIGIN}/bpr/p/${p.spid}`, name: p.name_en })) },
  }), crumbs([['BPR', '/bpr/'], ['Directory', '/bpr/providers/']])], 0.8],
  ['/bpr/verify/', [page('WebPage', '/bpr/verify/', 'Verify a provider — BPR', { potentialAction: { '@type': 'CheckAction', target: `${ORIGIN}/bpr/verify?spid={spid}`, 'query-input': 'required name=spid' } }), crumbs([['BPR', '/bpr/'], ['Verify', '/bpr/verify/']])], 0.8],
  ['/bpr/ledger/', [page('WebPage', '/bpr/ledger/', 'Transparency log — BPR'), crumbs([['BPR', '/bpr/'], ['Ledger', '/bpr/ledger/']])], 0.6],
  ['/bpr/research/', [page('CollectionPage', '/bpr/research/', 'Research footprint — BPR'), crumbs([['BPR', '/bpr/'], ['Research', '/bpr/research/']])], 0.6],
  ['/bpr/developers/', [page('WebPage', '/bpr/developers/', 'FHIR R4 & public API — BPR'), {
    '@type': 'WebAPI', name: 'BrainSAIT Provider Registry API', provider: { '@id': `${ORIGIN}/bpr#registry` }, documentation: `${ORIGIN}/bpr/developers/`,
    termsOfService: `${REGISTRY}/`, url: `${REGISTRY}/api`, sameAs: `${REGISTRY}/fhir/metadata`,
  }, crumbs([['BPR', '/bpr/'], ['FHIR & API', '/bpr/developers/']])], 0.7],
  ['/bpr/status/', [page('WebPage', '/bpr/status/', 'Operations status — BPR'), crumbs([['BPR', '/bpr/'], ['Status', '/bpr/status/']])], 0.4],
  ['/bpr/join/', [page('WebPage', '/bpr/join/', 'Join BPR'), crumbs([['BPR', '/bpr/'], ['Join', '/bpr/join/']])], 0.6],
  ...providers.flatMap((p) => [
    [`/bpr/p/${p.spid}/`, [page('ProfilePage', `/bpr/p/${p.spid}/`, `${p.name_en} · ${p.spid}`, {
      mainEntity: p.spid === OWNER_SPID ? { '@id': `${ORIGIN}/#person` } : {
        '@type': 'Person', name: p.name_en, alternateName: p.name_ar,
        identifier: { '@type': 'PropertyValue', propertyID: 'BPR SPID', value: p.spid },
        ...(p.orcid ? { sameAs: [p.orcid, p.profile_url] } : { sameAs: [p.profile_url] }),
      },
    }), ...(p.spid === OWNER_SPID ? [person] : []), crumbs([['BPR', '/bpr/'], ['Directory', '/bpr/providers/'], [p.name_en, `/bpr/p/${p.spid}/`]])], 0.6],
    ...(p.research_url ? [[`/bpr/research/${p.spid}/`, [page('CollectionPage', `/bpr/research/${p.spid}/`, `Research footprint · ${p.name_en}`), crumbs([['BPR', '/bpr/'], ['Research', '/bpr/research/'], [p.name_en, `/bpr/research/${p.spid}/`]])], 0.5]] : []),
  ]),
];

const server = await serve(root);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.route(/googletagmanager|google-analytics|facebook\.net|facebook\.com/, (r) => r.abort());
await ctx.addInitScript(() => { try { localStorage.setItem('bs-lang', 'en'); localStorage.setItem('bs-theme', 'dark'); } catch { /* */ } });
const tab = await ctx.newPage();
let written = 0;
const failures = [];

for (const [path, graph] of ROUTES) {
  const file = join(root, path, 'index.html');
  if (!existsSync(file)) { failures.push(`${path}: no file`); continue; }
  await tab.goto(server.base + path, { waitUntil: 'networkidle' });
  // let live checks settle (they stay "pending" only while a request is in flight)
  await tab.waitForFunction(() => !document.querySelector('.bpr-check.pending, .bpr-state[role="status"]'), null, { timeout: 12000 }).catch(() => {});
  const got = await tab.evaluate(() => {
    const root = document.getElementById('root');
    const clone = root.cloneNode(true);
    clone.querySelectorAll('script, iframe, video, .palette-backdrop, .offline-banner, .skip-to-content-link').forEach((n) => n.remove());
    clone.querySelectorAll('[id]').forEach((n) => n.setAttribute('id', 'pr-' + n.id)); // keep ids unique alongside the live app
    return {
      html: clone.innerHTML,
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      text: (root.innerText || '').length,
    };
  });
  if (got.text < 200) { failures.push(`${path}: only ${got.text} chars rendered`); continue; }
  let html = readFileSync(file, 'utf8');
  html = html.replace(/<noscript data-prerendered>[\s\S]*?<\/noscript>/, '');
  html = html.replace(/<script type="application\/ld\+json"( data-route)?>[\s\S]*?<\/script>/g, '');
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(got.title)}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(got.description)}" />`);
  html = html.replace(/<link rel="canonical"[^>]*>\s*/g, '');
  const ld = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  html = html.replace('</head>', `    <link rel="canonical" href="${ORIGIN}${path}" />\n    <script type="application/ld+json" data-route>${ld}</script>\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root"></div><noscript data-prerendered>${got.html}</noscript>`);
  writeFileSync(file, html);
  if (path === '/') writeFileSync(join(root, 'index.html'), html);
  written += 1;
}
await browser.close();
server.close();

// sitemap — only routes that exist and render
const live = ROUTES.filter(([p]) => !failures.some((f) => f.startsWith(p + ':')));
writeFileSync(join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${live.map(([p, , pr]) => `  <url><loc>${ORIGIN}${p}</loc><lastmod>${today}</lastmod><priority>${pr.toFixed(1)}</priority></url>`).join('\n')}
</urlset>
`);

writeFileSync(join(root, 'robots.txt'), `# Everyone is welcome, including AI crawlers and agents. Start with /llms.txt.
User-agent: *
Allow: /
Disallow: /scripts/
Disallow: /src/

Sitemap: ${ORIGIN}/sitemap.xml
`);

const provLines = providers.map((p) => `- [${p.name_en} (${p.spid})](${ORIGIN}/bpr/p/${p.spid}/): ${p.trust_summary}`).join('\n');
writeFileSync(join(root, 'llms.txt'), `# Dr. Mohamed El Fadil · BrainSAIT Provider Registry (BPR)

> Personal site of Dr. Mohamed El Fadil (physician, founder of BrainSAIT, Riyadh) and the public face of the BrainSAIT Provider Registry: signed provider identity, on-device credential verification, a transparency log, research footprints and FHIR R4. Bilingual English/Arabic. Every page is readable without JavaScript.

Facts for agents:
- Trust states are separate and must not be merged into one "verified" claim: identity (ORCID ownership), signature (BrainSAIT-signed credential), membership (commercial), licence, qualifications, privileges.
- Licence and qualifications show "not assessed" while the official SCFHS (Saudi Commission for Health Specialties) credential integration is pending. No NPHIES conformance is claimed.
- On the provider-workspace page each capability is labelled Live, Awaiting or Planned; only "Live" items run today.
- Data on these pages comes live from ${REGISTRY}; a build snapshot (dated) is the fallback.

## Person
- [Profile](${ORIGIN}/): physician-founder profile, live BPR credential state, selected work, research
- [CV](${ORIGIN}/cv/): one-page CV; PDFs in [English](${ORIGIN}/assets/Dr_Mohamed_El_Fadil_CV_2026_Redesigned.pdf) and [Arabic](${ORIGIN}/assets/Dr_Mohamed_El_Fadil_CV_2026_AR.pdf)
- [Business card](${ORIGIN}/card/)
- ORCID: https://orcid.org/0009-0003-7485-3575 · BPR SPID: ${OWNER_SPID}

## BPR pages
- [Overview](${ORIGIN}/bpr/)
- [Provider workspace](${ORIGIN}/bpr/workspace/): what each provider gets, with status per capability
- [Directory](${ORIGIN}/bpr/providers/)
- [Verify a provider](${ORIGIN}/bpr/verify/): \`${ORIGIN}/bpr/verify?spid={SPID}\` re-checks the signature in the browser
- [Transparency log](${ORIGIN}/bpr/ledger/)
- [Research](${ORIGIN}/bpr/research/)
- [FHIR & API](${ORIGIN}/bpr/developers/)
- [Status](${ORIGIN}/bpr/status/)
- [Join](${ORIGIN}/bpr/join/)

## Providers
${provLines}

## Machine-readable (all public, CORS *, read-only)
- Providers: ${REGISTRY}/api/providers · one provider: ${REGISTRY}/api/providers/{SPID} · search: ${REGISTRY}/api/search?q=
- Research: ${REGISTRY}/api/research?spid={SPID}
- FHIR R4: ${REGISTRY}/fhir/metadata · ${REGISTRY}/fhir/Practitioner/{SPID} · ${REGISTRY}/fhir/PractitionerRole?identifier={SPID}
- Signed credential (VC-JOSE, EdDSA): ${REGISTRY}/vc/{SPID} · status: ${REGISTRY}/vc/status/{SPID} · issuer keys: ${REGISTRY}/.well-known/did.json
- Transparency log: ${REGISTRY}/transparency/log.json · AI provenance heads: ${REGISTRY}/transparency/ai.json
- Snapshot copies on this site: ${ORIGIN}/assets/bpr-data/ (providers.json, providers/{SPID}.json, research/{SPID}.json, fhir/…, manifest.json)
- Embeddable live check: ${ORIGIN}/bpr/embed/{SPID}
`);

console.log(`prerender: ${written}/${ROUTES.length} page(s) written; sitemap ${live.length} URL(s); robots.txt; llms.txt`);
if (failures.length) { console.error('prerender failures:\n  ' + failures.join('\n  ')); process.exit(1); }
