import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './lib-serve.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const server = await serve(root);
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
try {
  for (const ar of [false, true]) {
    const prefix = ar ? '/ar' : '';
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    let researchRequests = 0;
    let datasetRequests = 0;
    let failResearch = false;
    let failDataset = false;
    let addressRequests = 0;
    await context.route('https://registry.brainsait.de/**', (route) => {
      if (route.request().url().includes('SA-PHY-900001')) {
        return route.fulfill({ status: 404, headers: { 'access-control-allow-origin': '*' } });
      }
      return route.abort();
    });
    await context.route('**/assets/bpr-data/vc/SA-PHY-900001.json', (route) => route.fulfill({ status: 404, contentType: 'application/json' }));
    await context.route('**/assets/bpr-data/vc/SA-PHY-900002.json', (route) => route.abort());
    await context.route('https://api.kfmc.med.sa/**', (route) => {
      researchRequests++;
      return failResearch
        ? route.abort()
        : route.fulfill({ json: [{ title: 'KFMC research fixture' }], headers: { 'access-control-allow-origin': '*' } });
    });
    await context.route('https://open.data.gov.sa/**', (route) => {
      datasetRequests++;
      if (failDataset) return route.abort();
      const resources = new URL(route.request().url()).pathname.endsWith('/resources');
      return route.fulfill({ json: resources
        ? { resources: [
          { name: 'Public dataset resource', format: 'CSV', downloadUrl: 'https://open.data.gov.sa/resource.csv' },
          { name: 'Unsafe fixture', downloadUrl: 'javascript:alert(1)' },
        ] }
        : { id: '94676134-5b08-44f0-bb71-73acd9566158', titleEn: 'Insurance dataset fixture', titleAr: 'مجموعة بيانات التأمين', providerNameEn: 'Publisher fixture', providerNameAr: 'جهة ناشرة تجريبية', updatedAt: '2026-01-02' },
      headers: { 'access-control-allow-origin': '*' } });
    });
    await context.route('https://api.address.gov.sa/**', (route) => { addressRequests++; return route.abort(); });

    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${server.base}${prefix}/bpr/`);
    const journeys = page.locator('.bpr-journey');
    await journeys.first().waitFor();
    assert.deepEqual(await journeys.evaluateAll((items) => items.map((item) => item.getAttribute('href'))), [
      `${prefix}/bpr/verify`, `${prefix}/bpr/join`, `${prefix}/bpr/providers`, `${prefix}/bpr/developers`,
    ]);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);

    await page.goto(`${server.base}${prefix}/bpr/research/`);
    await page.locator('#public-evidence').waitFor();
    assert.equal(researchRequests + datasetRequests, 0, 'external publishers are not called before visitor action');
    await page.getByRole('button', { name: ar ? 'تحميل بيانات الأبحاث' : 'Load research data' }).click();
    await page.getByText(ar ? 'عرض استجابة المصدر' : 'Show source response').click();
    await page.getByText('KFMC research fixture').waitFor();
    assert.equal(researchRequests, 1);
    await page.getByRole('button', { name: ar ? 'تحميل معلومات المجموعة' : 'Load dataset information' }).click();
    await page.getByText(ar ? 'مجموعة بيانات التأمين' : 'Insurance dataset fixture').waitFor();
    assert.equal(await page.getByRole('link', { name: 'Public dataset resource' }).getAttribute('href'), 'https://open.data.gov.sa/resource.csv');
    assert.equal(await page.getByRole('link', { name: 'Unsafe fixture' }).count(), 0, 'unsafe publisher URLs are not linked');
    assert.equal(datasetRequests, 2);

    failResearch = true;
    await page.getByRole('button', { name: ar ? 'تحميل بيانات الأبحاث' : 'Load research data' }).click();
    await page.getByRole('alert').getByText(ar ? 'تعذّر الوصول إلى واجهة مدينة الملك فهد الطبية' : 'Could not access or read the KFMC API', { exact: false }).waitFor();
    assert.equal(await page.getByRole('link', { name: ar ? 'توثيق واجهة مدينة الملك فهد الطبية' : 'KFMC API documentation' }).count(), 1);
    failDataset = true;
    await page.getByRole('button', { name: ar ? 'تحميل معلومات المجموعة' : 'Load dataset information' }).click();
    await page.getByRole('alert').getByText(ar ? 'تعذّر تحميل وصف المجموعة' : 'Could not load the dataset metadata', { exact: false }).waitFor();
    assert.equal(await page.getByRole('link', { name: ar ? 'عرض بيانات المجموعة لدى الناشر' : 'View dataset metadata at publisher' }).count(), 1);

    await page.goto(`${server.base}${prefix}/bpr/saudi/`);
    await page.getByText(ar ? 'تكامل العنوان الوطني غير متصل' : 'National Address is not connected', { exact: false }).waitFor();
    assert.equal(addressRequests, 0, 'National Address remains disconnected');
    await page.goto(`${server.base}${prefix}/bpr/workspace/`);
    await page.getByText(ar ? 'تجهيز OpenEMR للأعضاء' : 'Member OpenEMR provisioning', { exact: false }).waitFor();

    await page.goto(`${server.base}${prefix}/bpr/verify/`);
    const input = page.locator('#v-spid');
    await input.fill('SA-PHY-000003');
    await page.locator('.bpr-verify-form button[type=submit]').click();
    const sources = page.locator('.bpr-panel-head .bpr-source.snap');
    await sources.first().waitFor();
    assert.equal(await sources.count(), 2, 'credential and verification-key sources are both identified');
    assert.ok((await sources.allTextContents()).some((text) => text.includes(ar ? 'الاعتماد' : 'Credential')));
    assert.ok((await sources.allTextContents()).some((text) => text.includes(ar ? 'مفتاح التحقق' : 'Verification key')));
    await input.fill('bad');
    await page.locator('.bpr-verify-form button[type=submit]').click();
    await page.getByRole('alert').getByText(ar ? 'صيغة المعرّف غير صحيحة' : 'That is not a valid SPID', { exact: false }).waitFor();
    await input.fill('SA-PHY-900001');
    await page.locator('.bpr-verify-form button[type=submit]').click();
    await page.getByRole('alert').getByText(ar ? 'لم يُعثر على اعتماد منشور' : 'No published credential was found', { exact: false }).waitFor();
    await input.fill('SA-PHY-900002');
    await page.locator('.bpr-verify-form button[type=submit]').click();
    await page.getByRole('alert').getByText(ar ? 'تعذّر تحميل الاعتماد أو التحقق منه' : 'could not be loaded or checked', { exact: false }).waitFor();
    assert.equal(await page.getByRole('button', { name: ar ? 'أعد المحاولة' : 'Try again' }).count(), 1);
    await page.getByRole('button', { name: ar ? 'أعد المحاولة' : 'Try again' }).click();
    await page.getByRole('alert').getByText(ar ? 'تعذّر تحميل الاعتماد أو التحقق منه' : 'could not be loaded or checked', { exact: false }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, [], `${prefix}: browser runtime errors`);
    await context.close();
  }
  for (const ar of [false, true]) {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    const prefix = ar ? '/ar' : '';
    await page.goto(`${server.base}${prefix}/bpr/research/`);
    await page.getByRole('region', { name: ar ? 'مصادر عامة' : 'Public sources' }).waitFor();
    await context.close();
  }
  console.log('PASS: bilingual BPR journeys, on-demand mocked publisher data, source failures, retry, and National Address boundary.');
} finally {
  await browser.close();
  server.close();
}
