// Deterministic browser regression checks. No booking, credential or external-system writes.
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './lib-serve.mjs';
const require=createRequire(import.meta.url);
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const server=process.env.SITE_URL?null:await serve(root);
const base=process.env.SITE_URL||server.base;
const browser=await chromium.launch(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{});
const summary=[];
try{
 for(const ar of [false,true]){
  const prefix=ar?'/ar':'',context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.addInitScript({path:require.resolve('axe-core/axe.min.js')});
  await context.route('https://registry.brainsait.de/**',r=>r.abort());
  await context.route(/googletagmanager|google-analytics|facebook\.net|facebook\.com/,r=>r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+prefix+'/',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#finder:not([hidden])');
  assert.equal(await page.locator('.tool-card:visible').count(),9);
  await page.keyboard.press('Control+k');assert.equal(await page.locator('#tool-search').evaluate(el=>document.activeElement===el),true);
  await page.locator('#tool-search').fill('FHIR');assert.equal(await page.locator('.tool-card:visible').count(),2);
  await page.locator('#tool-search').fill('SA-PHY-000003');assert.equal(await page.locator('#spid-result').getAttribute('href'),prefix+'/bpr/verify/?spid=SA-PHY-000003');
  await page.locator('#tool-search').fill('no-match-xyz');assert.equal(await page.locator('#empty-state').isVisible(),true);
  await page.locator('#reset-search').click();await page.locator('[data-save="verify"]').click();await page.locator('[data-filter="saved"]').click();assert.equal(await page.locator('.tool-card:visible').count(),1);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('[data-save="verify"]:not([hidden])');assert.equal(await page.locator('[data-save="verify"]').getAttribute('aria-pressed'),'true');
  for(const theme of ['light','dark']){
   await page.evaluate(theme=>{localStorage.setItem('bs-theme',theme);document.documentElement.dataset.theme=theme;},theme);
   const violations=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)}));});
   assert.deepEqual(violations,[],`${prefix}/ ${theme} accessibility`);
  }
  await page.locator('#theme-toggle').click();const theme=await page.locator('html').getAttribute('data-theme');await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('#finder:not([hidden])');assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
  await page.waitForFunction(()=>document.getElementById('signal-summary').dataset.source);assert.equal(await page.locator('#signal-summary').getAttribute('data-source'),'snapshot');
  await page.setViewportSize({width:390,height:844});await page.locator('#menu-toggle').click();assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'),'false');
  for(const route of ['/','/profile/','/cv/','/card/','/bpr/','/bpr/providers/','/bpr/verify/','/bpr/ledger/','/bpr/research/','/bpr/developers/','/bpr/status/','/bpr/workspace/','/bpr/clinic/','/bpr/nphies/','/bpr/join/','/bpr/record/','/bpr/saudi/','/slots/']){
   const response=await page.goto(base+prefix+route,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200,route);
   await page.waitForSelector('h1');await page.waitForTimeout(200);
   assert.equal(await page.locator('h1').count(),1,`${prefix}${route}: one main heading`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${prefix}${route}: overflow`);
   assert.ok((await page.locator('body').innerText()).length>200,`${prefix}${route}: content`);
   assert.equal(await page.getByRole('alert').filter({hasText:new RegExp(['This page could not load', 'تعذّر تحميل هذه الصفحة'].join('|'))}).count(),0,route);
  }
  await page.goto(base+prefix+'/bpr/clinic/',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:ar?'الطلبات':'Requests',exact:true}).click();
  await page.getByRole('textbox',{name:ar?'ابحث في الطلبات…':'Search requests…'}).fill('synthetic-no-match');
  await page.getByRole('button',{name:ar?'استقبال المرضى':'Patient reception',exact:true}).click();await page.waitForSelector('.clinic-chat-compose');
  const clinicViolations=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)}));});
  assert.deepEqual(clinicViolations,[],`${prefix}: clinic accessibility`);
  // No form is submitted. The pilot must never produce a real booking from a smoke check.
  assert.deepEqual(errors,[],`${prefix}: runtime errors`);
  summary.push(`${ar?'Arabic':'English'}: search, SPID handoff, saved tools, themes, snapshot fallback, keyboard/menu, WCAG A/AA and 18 mobile routes passed`);
  await context.close();
 }
 const nojs=await browser.newContext({javaScriptEnabled:false});const page=await nojs.newPage();await page.goto(base+'/ar/');assert.equal(await page.locator('.tool-card:visible').count(),9);await nojs.close();summary.push('Arabic toolkit readable without JavaScript');
 const offline=await browser.newContext({viewport:{width:390,height:844}});
 const offlinePage=await offline.newPage();await offlinePage.goto(base+'/',{waitUntil:'load'});
 await offlinePage.evaluate(()=>navigator.serviceWorker.ready);
 await offlinePage.waitForFunction(async()=>{const keys=await caches.keys();const cache=await caches.open(keys.find(k=>k.startsWith('ef-')));return !!await cache.match('/assets/launchpad/landing.js')&&!!await cache.match('/ar/bpr/verify/');},null,{timeout:30000});
 await offline.setOffline(true);
 for(const route of ['/','/ar/','/bpr/verify/','/ar/bpr/verify/']){
  await offlinePage.goto(base+route,{waitUntil:'domcontentloaded'});await offlinePage.waitForSelector('h1');
  if(route.includes('verify'))await offlinePage.waitForSelector('.offline-banner');
  else{await offlinePage.waitForSelector('#finder:not([hidden])');await offlinePage.locator('#tool-search').fill('FHIR');assert.equal(await offlinePage.locator('.tool-card:visible').count(),2);}
 }
 await offline.close();summary.push('Offline English/Arabic search and verification open with explicit offline limits');
 console.log(summary.map(s=>'PASS '+s).join('\n'));
}finally{await browser.close();server?.close();}
