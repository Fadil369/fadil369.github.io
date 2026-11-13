import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindingProblem, checkCredential, credentialStatus, CredentialNotFoundError, validityWindow, verifyJwt, type CredentialClaims } from './bpr.ts';
const now=Date.now();
const claims={ issuer:{id:'did:web:registry.brainsait.de'}, credentialSubject:{spid:'SA-PHY-000003'}, validFrom:new Date(now-60000).toISOString(),validUntil:new Date(now+3600000).toISOString() } as CredentialClaims;
test('validity window rejects missing, malformed and reversed dates',()=>{
 assert.equal(validityWindow(claims).state,'ok');
 for(const change of [{validFrom:''},{validFrom:'invalid'},{validUntil:''},{validUntil:'invalid'},{validFrom:claims.validUntil},{validUntil:new Date(now-600000).toISOString()}])assert.equal(validityWindow({...claims,...change}).state,'fail');
});
test('credential binding requires the actual issuer and requested provider',()=>{
 assert.equal(bindingProblem(claims,'SA-PHY-000003'),'');
 assert.notEqual(bindingProblem(claims,'SA-PHY-000002'),'');
 assert.notEqual(bindingProblem({...claims,issuer:{id:'did:web:other.invalid'}} as CredentialClaims),'');
});
test('signature check accepts authentic Ed25519 and rejects tampering and alg substitution',async()=>{
 const keys=await crypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']);
 const jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'test-key'};
 const enc=(s:string)=>Buffer.from(s).toString('base64url');
 const header=enc(JSON.stringify({alg:'EdDSA',kid:'test-key'})),payload=enc(JSON.stringify(claims)),unsigned=header+'.'+payload;
 const signature=Buffer.from(await crypto.subtle.sign('Ed25519',keys.privateKey,Buffer.from(unsigned))).toString('base64url');
 const jwt=unsigned+'.'+signature;
 assert.equal((await verifyJwt(jwt,[jwk] as never)).state,'ok');
 assert.equal((await verifyJwt(header+'.'+enc(JSON.stringify({...claims,id:'tampered'}))+'.'+signature,[jwk] as never)).state,'fail');
 const invalid=enc(JSON.stringify({alg:'none',kid:'test-key'}))+'.'+payload+'.'+signature;
 assert.equal((await verifyJwt(invalid,[jwk] as never)).state,'fail');
});

test('credential status never treats an unknown state as current',()=>{
 assert.equal(credentialStatus('current').state,'ok');
 assert.equal(credentialStatus('revoked').state,'fail');
 assert.equal(credentialStatus('future-state').state,'unavailable');
 assert.equal(credentialStatus(undefined).state,'unavailable');
});

test('only two confirmed 404 responses mean a credential is missing',async()=>{
 const originalFetch=globalThis.fetch;
 const response=(status:number,data:unknown={})=>({ok:status===200,status,json:async()=>data}) as Response;
 try {
  globalThis.fetch=(async(input:RequestInfo|URL)=>{
   const url=String(input);
   if(url.includes('/vc/SA-PHY-900001'))return response(404);
   if(url.includes('/.well-known/did.json'))return response(200,{verificationMethod:[]});
   throw new Error(`Unexpected request ${url}`);
  }) as typeof fetch;
  await assert.rejects(checkCredential('SA-PHY-900001'),CredentialNotFoundError);

  globalThis.fetch=(async(input:RequestInfo|URL)=>{
   const url=String(input);
   if(url.endsWith('/vc/SA-PHY-900002'))throw new TypeError('network failure');
   if(url.endsWith('/assets/bpr-data/vc/SA-PHY-900002.json'))return response(404);
   if(url.endsWith('/.well-known/did.json'))return response(200,{verificationMethod:[]});
   throw new Error(`Unexpected request ${url}`);
  }) as typeof fetch;
  await assert.rejects(checkCredential('SA-PHY-900002'),(error:unknown)=>!(error instanceof CredentialNotFoundError));
 } finally { globalThis.fetch=originalFetch; }
});
