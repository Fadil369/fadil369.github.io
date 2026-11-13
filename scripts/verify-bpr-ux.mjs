import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './lib-serve.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const server = await serve(root);
const browser = await chromium.launch();
try {
  for (const ar of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    if (ar) await context.addInitScript(() => { Object.defineProperty(AbortSignal, 'timeout', { value: undefined, configurable: true }); });
    await context.route('https://registry.brainsait.de/**', (route) => {
      if (route.request().url().includes('SA-PHY-900001')) {
        return route.fulfill({ status: 404, headers: { 'access-control-allow-origin': '*' } });
      }
      return route.abort();
    });
    let publicRequests = 0;
    let failResearch = false;
    await context.route('https://api.kfmc.med.sa/**', (route) => {
      publicRequests++;
      return failResearch ? route.abort() : route.fulfill({ json: [{ title: 'Research example' }], headers: { 'access-control-allow-origin': '*' } });
    });
    await context.route('https://open.data.gov.sa/**', (route) => {
      publicRequests++;
      const resources = route.request().url().includes('/resources?');
      return route.fulfill({ json: resources
        ? { resources: [{ name: 'Public resource', downloadUrl: 'https://open.data.gov.sa/resource' }] }
        : { id: '94676134-5b08-44f0-bb71-73acd9566158', titleEn: 'Insurance dataset', titleAr: 'مجموعة التأمين' },
      headers: { 'access-control-allow-origin': '*' } });
    });
    const page = await context.newPage();
    const prefix = ar ? '/ar' : '';
    await page.goto(`${server.base}${prefix}/bpr/`);
    const journeys = page.locator('.bpr-journey');
    await journeys.first().waitFor();
    await assert.equal(await journeys.count(), 4);
    await assert.equal(await journeys.first().getAttribute('href'), `${prefix}/bpr/verify`);
    await assert.equal(await page.locator('.bpr-tool-details').evaluate((el) => el.open), false);
    await page.locator('.bpr-tool-details summary').click();
    await assert.equal(await page.locator('.bpr-tool-details').evaluate((el) => el.open), true);
    await assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.goto(`${server.base}${prefix}/bpr/research/`);
    await page.locator('#public-evidence').waitFor();
    assert.equal(publicRequests, 0);
    await page.getByRole('button', { name: ar ? 'تحميل بيانات الأبحاث' : 'Load research data' }).click();
    await page.getByText(ar ? 'عرض استجابة المصدر' : 'Show source response').click();
    await page.getByText('Research example', { exact: false }).waitFor();
    await page.getByRole('button', { name: ar ? 'تحميل معلومات المجموعة' : 'Load dataset information' }).click();
    await page.getByText(ar ? 'مجموعة التأمين' : 'Insurance dataset').waitFor();
    assert.equal(await page.getByRole('link', { name: 'Public resource' }).count(), 1);
    failResearch = true;
    await page.getByRole('button', { name: ar ? 'تحميل بيانات الأبحاث' : 'Load research data' }).click();
    await page.getByRole('alert').getByText(ar ? 'تعذّر الوصول إلى واجهة مدينة الملك فهد الطبية' : 'Could not access or read the KFMC API', { exact: false }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.goto(`${server.base}${prefix}/bpr/research/SA-PHY-000003/`);
    await page.getByRole('link', { name: ar ? 'الدعم' : 'Support', exact: true }).click();
    await page.waitForURL(`${server.base}/#contact`);
    await page.goto(`${server.base}${prefix}/bpr/saudi/`);
    await page.getByText(ar ? 'تكامل العنوان الوطني غير متاح بعد' : 'National Address integration is not connected', { exact: false }).waitFor();

    await page.goto(`${server.base}${prefix}/bpr/verify/`);
    const input = page.locator('#v-spid');
    await input.fill('bad');
    await page.locator('.bpr-verify-form button[type=submit]').click();
    await page.getByRole('alert').getByText(ar ? 'صيغة المعرّف غير صحيحة' : 'That is not a valid SPID', { exact: false }).waitFor();
    await input.fill('SA-PHY-900001');
    await page.locator('.bpr-verify-form button[type=submit]').click();
    await page.getByRole('alert').getByText(ar ? 'لم يُعثر على اعتماد منشور' : 'No published credential was found', { exact: false }).waitFor();
    await input.fill('SA-PHY-900002');
    await page.locator('.bpr-verify-form button[type=submit]').click();
    await page.getByRole('alert').getByText(ar ? 'تعذّر تحميل الاعتماد' : 'The credential could not be loaded or checked', { exact: false }).waitFor();
    await assert.equal(await page.getByRole('button', { name: ar ? 'أعد المحاولة' : 'Try again' }).count(), 1);
    await assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await context.close();
  }
  console.log('BPR English and Arabic mobile journeys and verification failure states passed.');
} finally {
  await browser.close();
  server.close();
}
