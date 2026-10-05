// publish.mjs — copy built output to repo root so `git push` deploys to
// fadil369.github.io via GitHub Pages (matches the original deploy layout).
// The build entry lives at src/index.html, so the built HTML is at
// dist/src/index.html; it is flattened to the repo root here.
import { cpSync, rmSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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

for (const route of ['learn', 'build', 'solutions', 'templates', 'oid', 'sprint', 'benefits', 'account', 'track', 'faq', 'terms', 'support', 'contact', 'slots', 'doctors']) {
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
  ].filter((i) => i && typeof i === 'object' && i.slug);

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

for (const f of ['assets']) {
  const src = join(dist, f), dst = join(root, f);
  if (existsSync(dst)) rmSync(dst, { recursive: true, force: true });
  cpSync(src, dst, { recursive: true });
}
console.log('Published dist/ -> repo root. Commit & push to deploy.');
