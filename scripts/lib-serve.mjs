// Tiny static server over the published repo root, for the post-publish scripts (prerender, CV PDF).
// Unknown paths get 404.html, the same SPA fallback GitHub Pages serves.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };

export async function serve(root) {
  const server = createServer((req, res) => {
    let f = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!f.startsWith(root)) { res.writeHead(403).end(); return; }
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (!existsSync(f)) f = join(root, '404.html');
    res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }).end(readFileSync(f));
  }).listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}
