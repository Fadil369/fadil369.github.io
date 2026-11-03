// Local preview with the same missing-route status as GitHub Pages.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, resolve, relative } from 'node:path';
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.pdf':'application/pdf','.webmanifest':'application/manifest+json','.txt':'text/plain; charset=utf-8'};
export async function serve(root){
 root=resolve(root);
 const server=createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
  let file;
  try{file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return;}
  const rel=relative(root,file);
  if(rel==='..'||rel.startsWith('../')){res.writeHead(403).end();return;}
  if(existsSync(file)&&statSync(file).isDirectory())file=join(file,'index.html');
  let status=200;
  if(!existsSync(file)||!statSync(file).isFile()){status=404;file=join(root,'404.html');}
  const body=existsSync(file)?readFileSync(file):Buffer.from('Not found');
  res.writeHead(status,{'content-type':TYPES[extname(file)]||'application/octet-stream','cache-control':'no-store'}).end(req.method==='HEAD'?undefined:body);
 }).listen(0,'127.0.0.1');
 await new Promise((yes,no)=>{server.once('listening',yes);server.once('error',no);});
 return {base:`http://127.0.0.1:${server.address().port}`,close:()=>server.close()};
}
