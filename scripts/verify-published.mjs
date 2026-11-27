// Offline deployment guard: catch missing assets, broken launch links, invalid JS and cache drift.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';
import { STANDALONE } from './standalone.mjs';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const errors=[];
const routes=['/','/profile/','/cv/','/card/','/slots/','/bpr/','/bpr/ai/','/bpr/providers/','/bpr/verify/','/bpr/workspace/','/bpr/clinic/','/bpr/ledger/','/bpr/research/','/bpr/developers/','/bpr/status/','/bpr/join/','/bpr/record/','/bpr/nphies/','/bpr/saudi/'];
const standalone=STANDALONE.map(p=>`/${p.route}/`);
for(const path of [...standalone,...standalone.map(p=>'/ar'+p)]){
 // Hand-authored pages: a script that looks up an id the page lacks crashes on load.
 const file=join(root,path,'index.html');if(!existsSync(file))continue;
 const html=readFileSync(file,'utf8');
 if(!html.includes('<meta name="bs-page" content="standalone">'))errors.push(`${path}: not published from standalone/`);
 if(/http-equiv="Content-Security-Policy"/.test(html))errors.push(`${path}: app CSP would block this page's inline scripts`);
 for(const [,id] of html.matchAll(/getElementById\(['"]([\w-]+)['"]\)/g))if(!html.includes(`id="${id}"`)&&!html.includes(`id='${id}'`))errors.push(`${path}: script expects #${id}, page has none`);
}
for(const path of [...routes,...standalone,...routes.map(p=>'/ar'+p),...standalone.map(p=>'/ar'+p)]){
 const file=join(root,path,'index.html');
 if(!existsSync(file)){errors.push(`${path}: missing document`);continue;}
 const html=readFileSync(file,'utf8');
 if(!/<title>[^<]+<\/title>/.test(html))errors.push(`${path}: missing title`);
 if(path.startsWith('/ar/')&&!/<html[^>]*lang="ar"[^>]*dir="rtl"/.test(html))errors.push(`${path}: Arabic language or direction missing`);
 for(const [tag,attrs,body] of [...html.matchAll(/(<script\b([^>]*)>)([\s\S]*?)<\/script\b[^>]*>/gi)].map(m=>[m[1],m[2],m[3]])){
  if(!body.trim()||/application\/ld\+json/.test(attrs))continue;
  try{new Script(body);}catch(e){errors.push(`${path}: invalid inline JavaScript: ${e.message}`);}
 }
 for(const m of html.matchAll(/\b(?:src|href)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)){
  const target=join(root,decodeURI(m[1]));
  if(!existsSync(target)||(statSync(target).isDirectory()&&!existsSync(join(target,'index.html'))))errors.push(`${path}: missing ${m[1]}`);
 }
}
for(const path of ['/','/ar/']){
 const html=readFileSync(join(root,path,'index.html'),'utf8');
 assert.ok(html.includes('data-tool="verify"'),`${path}: toolkit missing`);
 assert.ok(!html.includes('redirectCount'),`${path}: timed redirect returned`);
 assert.ok(!html.includes('onclick='),`${path}: inline event handler returned`);
}
for(const file of ['assets/launchpad/landing.js','sw.js']){
 try{new Script(readFileSync(join(root,file),'utf8'));}catch(e){errors.push(`${file}: ${e.message}`);}
}
const worker=readFileSync(join(root,'sw.js'),'utf8');
const precache=JSON.parse(worker.match(/const PRECACHE = (\[[^;]+\]);/)[1]);
for(const path of precache){const file=join(root,path);if(!existsSync(file)||(statSync(file).isDirectory()&&!existsSync(join(file,'index.html'))))errors.push(`precache: missing ${path}`);}
for(const path of ['/assets/launchpad/landing.js','/assets/launchpad/landing.css','/bpr/clinic/','/ar/bpr/clinic/','/bpr/ai/','/ar/bpr/ai/'])if(!precache.includes(path))errors.push(`precache: absent ${path}`);
if(errors.length){console.error([...new Set(errors)].join('\n'));process.exit(1);}
console.log(`PASS: ${(routes.length+standalone.length)*2} routes (${standalone.length*2} standalone), local links/assets, inline JS, both landing pages and ${precache.length} offline entries.`);
