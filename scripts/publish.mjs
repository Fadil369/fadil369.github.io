// publish.mjs — copy built output to repo root so `git push` deploys to
// fadil369.github.io via GitHub Pages (matches the original deploy layout).
// The build entry lives at src/index.html, so the built HTML is at
// dist/src/index.html; it is flattened to the repo root here.
import { cpSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
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

for (const f of ['assets']) {
  const src = join(dist, f), dst = join(root, f);
  if (existsSync(dst)) rmSync(dst, { recursive: true, force: true });
  cpSync(src, dst, { recursive: true });
}
console.log('Published dist/ -> repo root. Commit & push to deploy.');
