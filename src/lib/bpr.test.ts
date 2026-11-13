import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindingProblem, credentialStatus, validityWindow, verifyJwt, type CredentialClaims } from './bpr.ts';
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
test('only known terminal credential states are reported as failed',()=>{
 assert.equal(credentialStatus('current').state,'ok');
 for(const state of ['revoked','expired','superseded'])assert.equal(credentialStatus(state).state,'fail');
 for(const state of [undefined,'unknown','pending'])assert.equal(credentialStatus(state).state,'unavailable');
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
