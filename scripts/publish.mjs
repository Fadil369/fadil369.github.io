// publish.mjs — copy built output to repo root so `git push` deploys to
// fadil369.github.io via GitHub Pages (matches the original deploy layout).
import { cpSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = dirname(scriptDir); // repo root = parent of /scripts
const dist = join(root, 'dist');
if (!existsSync(dist)) {
  console.error('No dist/ — run `npm run build` first. CWD-independent check failed at', dist);
  process.exit(1);
}

const index = readFileSync(join(dist, 'index.html'), 'utf8');
writeFileSync(join(root, '404.html'), index); // SPA fallback for hard refresh

for (const f of ['index.html', 'assets']) {
  const src = join(dist, f), dst = join(root, f);
  if (existsSync(dst)) rmSync(dst, { recursive: true, force: true });
  cpSync(src, dst, { recursive: true });
}
console.log('Published dist/ -> repo root. Commit & push to deploy.');
