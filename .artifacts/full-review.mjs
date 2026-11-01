import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { serve } from '../scripts/lib-serve.mjs';

const routes = ['/', '/cv/', '/card/', '/slots/', '/bpr/', '/bpr/record/', '/bpr/saudi/', '/bpr/workspace/', '/bpr/providers/', '/bpr/verify/', '/bpr/ledger/', '/bpr/research/', '/bpr/developers/', '/bpr/status/', '/bpr/join/', '/bpr/p/SA-PHY-000001/', '/bpr/p/SA-PHY-000002/', '/bpr/p/SA-PHY-000003/', '/bpr/research/SA-PHY-000003/', '/bpr/embed/SA-PHY-000001/', '/bpr/embed/SA-PHY-000002/', '/bpr/embed/SA-PHY-000003/'];
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const out = '.artifacts/full-review';
mkdirSync(out, { recursive: true });
const server = await serve(process.cwd());
const browser = await chromium.launch({ headless: true });
const results = [];
for (const lang of ['en', 'ar']) {
  const context = await browser.newContext({ locale: lang === 'ar' ? 'ar-SA' : 'en-GB', bypassCSP: true });
  await context.addInitScript((l) => { localStorage.setItem('bs-lang', l); localStorage.setItem('bs-theme', 'dark'); }, lang);
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', (e) => runtimeErrors.push(e.message));
  for (const mobile of [false, true]) {
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
    for (const route of routes) {
      const path = (lang === 'ar' ? '/ar' : '') + route;
      const name = `${lang}-${route.replace(/^\//, '').replace(/\/$/, '').replaceAll('/', '-') || 'home'}-${mobile ? 'mobile' : 'desktop'}`;
      const response = await page.goto(server.base + path, { waitUntil: 'networkidle', timeout: 30000 });
      await page.evaluate(() => document.fonts.ready);
      const audit = await page.evaluate(async (axeSource) => {
        eval(axeSource);
        const result = await globalThis.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
        return result.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, targets: v.nodes.slice(0, 3).map((n) => n.target) }));
      }, axe);
      const visual = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        broken: [...document.images].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.src),
        title: document.title,
        h1: document.querySelectorAll('h1').length,
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        statusNav: [...document.querySelectorAll('nav a')].some((a) => a.getAttribute('href')?.includes('/bpr/status')),
      }));
      await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
      const errors = runtimeErrors.splice(0);
      results.push({ path, mobile, status: response?.status(), ...visual, violations: audit, errors });
      console.log(`${response?.status()} ${name}: overflow=${visual.overflow} broken=${visual.broken.length} axe=${audit.length} errors=${errors.length}`);
    }
  }
  await context.close();
}
await browser.close();
server.close();
writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
const failures = results.filter((r) => r.status !== 200 || r.overflow || r.broken.length || r.h1 !== (r.path.includes('/embed/') ? 0 : 1) || r.statusNav || r.errors.length || r.violations.some((v) => ['serious', 'critical'].includes(v.impact)));
console.log(`Reviewed ${results.length} route/language/viewport combinations; ${failures.length} require attention.`);
if (failures.length) console.log(JSON.stringify(failures, null, 2));
process.exitCode = failures.length ? 1 : 0;
