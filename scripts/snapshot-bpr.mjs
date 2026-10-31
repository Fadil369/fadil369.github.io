// snapshot-bpr.mjs — copy public BrainSAIT Provider Registry data into the static site.
//
// GitHub Pages cannot proxy, and the registry's /api and /fhir routes send no CORS
// header, so the BPR pages read this snapshot when a live call is blocked. The
// credential, DID document and transparency log are snapshotted too, as an offline
// fallback; the pages still try those live first and verify signatures in the browser.
//
// Only public data the registry already publishes is written. A failed fetch keeps the
// previous file, so a registry outage never empties the site.
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REGISTRY = 'https://registry.brainsait.de';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, 'public', 'assets', 'bpr-data');
const SPID_RE = /^SA-[A-Z]{2,4}-\d{6}$/;

let ok = 0;
let kept = 0;

async function get(path) {
  const r = await fetch(REGISTRY + path, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

async function save(file, path) {
  const dest = join(out, file);
  try {
    const data = await get(path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, JSON.stringify(data, null, 1) + '\n');
    ok += 1;
    return data;
  } catch (e) {
    kept += 1;
    console.warn(`snapshot: kept previous ${file} (${e.message})`);
    return existsSync(dest) ? JSON.parse(readFileSync(dest, 'utf8')) : null;
  }
}

const providers = await save('providers.json', '/api/providers');
await Promise.all([
  save('status.json', '/api/status'),
  save('specialties.json', '/api/specialties'),
  save('organizations.json', '/api/organizations'),
  save('fhir/metadata.json', '/fhir/metadata'),
  save('did.json', '/.well-known/did.json'),
  save('transparency/log.json', '/transparency/log.json'),
]);

const spids = (providers?.items ?? []).map((p) => p.spid).filter((s) => SPID_RE.test(s));
for (const spid of spids) {
  const p = await save(`providers/${spid}.json`, `/api/providers/${spid}`);
  await save(`fhir/Practitioner/${spid}.json`, `/fhir/Practitioner/${spid}`);
  if (p?.research_url) await save(`research/${spid}.json`, `/api/research?spid=${spid}`);
  if (p?.trust?.signature === 'current') await save(`vc/${spid}.json`, `/vc/${spid}`);
}

const manifest = { source: REGISTRY, snapshotAt: new Date().toISOString(), spids };
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(`snapshot: ${ok} file(s) refreshed, ${kept} kept, ${spids.length} provider(s) → public/assets/bpr-data/`);
