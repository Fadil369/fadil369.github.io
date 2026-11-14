// prune-assets.mjs — delete hashed build files in assets/ that nothing references any more.
//
// The site is committed build output, and every build adds new hashed chunks without removing the old ones.
// A file is kept when it is reachable (through names in HTML, sw.js and, transitively, other assets) from
//   - the working tree now, or
//   - any --keep-ref <git ref> (default HEAD, i.e. the previously committed build), so a visitor with a cached
//     page from the last release still finds its chunks.
// Only files with a Vite content hash (name-XXXXXXXX.ext) are candidates; unhashed files are never touched.
// Git history still holds everything removed here.
//
//   node scripts/prune-assets.mjs                      # dry run, prints what would go
//   node scripts/prune-assets.mjs --apply              # delete
//   node scripts/prune-assets.mjs --apply --keep-ref HEAD --keep-ref <older-ref>
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const refs = args.flatMap((a, i) => (a === '--keep-ref' ? [args[i + 1]] : []));
if (!refs.length) refs.push('HEAD');

const HASHED = /^.+-[A-Za-z0-9_-]{8}\.(js|css|woff2?|png|jpe?g|svg|webp|avif|gif|ico|json|map)$/;
const TEXT = /\.(js|css|html|map|json|svg)$/;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'src', 'docs', 'plugins', 'acp', 'deploy', 'scripts', 'assets']);

const names = readdirSync(join(root, 'assets'));
const candidates = new Set(names.filter((n) => HASHED.test(n)));
const known = new Set(names);
const tokens = (text) => (text.match(/[A-Za-z0-9_.\-]+\.[A-Za-z0-9]+/g) ?? []).filter((t) => known.has(t));

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(join(dir, e.name), out); }
    else if (/\.html$/.test(e.name) || e.name === 'sw.js' || e.name === 'manifest.webmanifest') out.push(join(dir, e.name).slice(root.length + 1));
  }
  return out;
}
const git = (a) => execFileSync('git', a, { cwd: root, maxBuffer: 1 << 28 });

function reach(rootsList, read) {
  const keep = new Set();
  const queue = [];
  for (const f of rootsList) for (const t of tokens(read(f) ?? '')) if (!keep.has(t)) { keep.add(t); queue.push(t); }
  while (queue.length) {
    const n = queue.pop();
    if (!TEXT.test(n)) continue;
    for (const t of tokens(read(`assets/${n}`) ?? '')) if (!keep.has(t)) { keep.add(t); queue.push(t); }
  }
  return keep;
}

const keep = reach([...walk(root), ...(existsSync(join(root, 'sw.js')) ? [] : [])].concat(existsSync(join(root, 'sw.js')) ? ['sw.js'] : []),
  (f) => { try { return readFileSync(join(root, f), 'utf8'); } catch { return ''; } });
for (const ref of refs) {
  const files = git(['ls-tree', '-r', '--name-only', ref]).toString().split('\n').filter((f) => /\.html$/.test(f) && !f.split('/').some((p) => SKIP_DIRS.has(p)) || f === 'sw.js');
  const k = reach(files, (f) => { try { return git(['show', `${ref}:${f}`]).toString('utf8'); } catch { return ''; } });
  for (const t of k) keep.add(t);
}

const doomed = [...candidates].filter((n) => !keep.has(n)).sort();
let bytes = 0;
for (const n of doomed) { bytes += statSync(join(root, 'assets', n)).size; if (apply) unlinkSync(join(root, 'assets', n)); }
console.log(`${apply ? 'Deleted' : 'Would delete'} ${doomed.length} of ${candidates.size} hashed files in assets/ (${(bytes / 1048576).toFixed(1)} MB); keeping ${candidates.size - doomed.length}. Refs kept: ${refs.join(', ')}.`);
