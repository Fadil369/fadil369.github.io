// Manual browser check of the synthetic clinic flow: reception booking -> front desk -> doctor room -> overview.
// Not part of CI (needs a browser).
//
//   npm run dev -- --port 5199 &            # or serve a built site
//   CLINIC_E2E_URL=http://127.0.0.1:5199 npm run verify:clinic-flow
//   ACP_E2E_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ...   # use an installed Chrome
//
// Everything is synthetic and local to the browser profile; the registry status calls the page makes on its own are
// the only network traffic, and failures of those are not counted as page errors.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = (process.env.CLINIC_E2E_URL || 'http://127.0.0.1:5199').replace(/\/$/, '');
const browser = await chromium.launch({ executablePath: process.env.ACP_E2E_CHROME || undefined });
let failed;
try {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'], locale: 'en-GB', timezoneId: 'Asia/Riyadh' });
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/Failed to load resource|CORS|net::ERR/i.test(m.text())) return; // registry status calls
    if (/unsupported MIME type/.test(m.text())) return; // the Vite dev server answers a missing script with HTML; present on every page, not on the built site
    problems.push(`console: ${m.text()} [after: ${step}]`);
  });

  let step = 'start';
  const riyadhToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
  const nextWorkday = () => {
    for (let i = 1; i < 10; i++) {
      const d = new Date(Date.now() + i * 86400000);
      const iso = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
      const dow = new Date(`${iso}T12:00:00+03:00`).getDay();
      if (dow !== 5 && dow !== 6) return iso;
    }
    throw new Error('no workday found');
  };
  const nav = (name) => { step = `nav ${name}`; return page.locator('.clinic-sidebar nav').getByRole('button', { name }).click(); };

  await page.goto(`${BASE}/bpr/clinic`);
  await page.evaluate(() => localStorage.clear());
  step = 'reload'; await page.reload();

  // 1. Reception: book a slot for the next working day.
  await nav('Patient reception');
  await page.fill('input[placeholder="Patient 007"]', 'Patient 007');
  await page.fill('input[type="date"]', nextWorkday());
  await page.locator('.clinic-slot').first().click();
  await page.getByRole('button', { name: /Review demo booking/ }).click();
  await page.locator('.clinic-booking-review input[type="checkbox"]').check();
  await page.locator('.clinic-booking-review').getByRole('button', { name: /^Confirm/ }).click();
  const reference = (await page.locator('.clinic-success .clinic-reference').textContent()).trim();
  assert.match(reference, /^DEMO-/);

  // 2. Front desk: the booking is listed, but cannot be checked in before its day.
  await nav('Front desk');
  const row = page.locator('tbody tr', { hasText: 'Patient 007' });
  await row.waitFor();
  assert.match(await row.textContent(), /Booked/);
  assert.equal(await row.getByRole('button', { name: /Check in/ }).isDisabled(), true, 'future booking cannot check in');

  // A real name is refused by the form itself.
  const label = page.getByLabel('Synthetic patient label');
  await label.fill('Ahmed Ali');
  assert.equal(await label.evaluate((el) => el.validity.patternMismatch), true, 'real-looking name is rejected');

  // Walk-ins: routine first, urgent second; the urgent one must be called first.
  await label.fill('Patient 043');
  await page.getByRole('button', { name: 'Check in walk-in' }).click();
  await label.fill('Patient 042');
  await page.getByLabel('Urgent (seen first)').check();
  await page.getByRole('button', { name: 'Check in walk-in' }).click();
  const queueNames = await page.locator('.visit-queue-item strong').allTextContents();
  assert.deepEqual(queueNames, ['Patient 042', 'Patient 043'], 'urgent patient is first in the waiting room');

  // A booking for today can be checked in (seeded, because the demo schedule has no weekend slots).
  await page.evaluate((today) => {
    const list = JSON.parse(localStorage.getItem('brainsait_clinic_requests') || '[]');
    const at = new Date().toISOString();
    list.unshift({ id: 'DEMO-SEED', reference: 'DEMO-SEED', patient: 'Patient 099', service: 'dental', date: today, time: '09:00', status: 'booked', priority: 'routine', createdAt: at, history: [{ status: 'booked', at }] });
    localStorage.setItem('brainsait_clinic_requests', JSON.stringify(list));
  }, riyadhToday());
  await nav('Overview');
  await nav('Front desk');
  await page.getByRole('button', { name: /Check in Patient 099/ }).click();
  assert.equal((await page.locator('.visit-queue-item strong').allTextContents()).length, 3);

  // 3. Doctor room: second tab stays in sync, then the consultation.
  const second = await context.newPage();
  await second.goto(`${BASE}/bpr/clinic`);
  await second.locator('.clinic-sidebar nav').getByRole('button', { name: 'Doctor room' }).click();
  assert.equal((await second.locator('.visit-queue-item strong').allTextContents()).length, 3, 'second tab sees the shared queue');
  await page.getByLabel('Synthetic patient label').fill('Patient 044');
  await page.getByRole('button', { name: 'Check in walk-in' }).click();
  await second.waitForFunction(() => document.querySelectorAll('.visit-queue-item').length === 4);

  await second.close();
  await nav('Doctor room');
  step = 'call next'; await page.getByRole('button', { name: 'Call next patient' }).click();
  assert.match(await page.locator('.visit-patient-line').textContent(), /Patient 042/);

  // Real identifier in the note is refused; implausible vitals are refused; then it completes.
  await page.getByLabel('Chief complaint').fill('Cough, national id 1023456789');
  await page.getByLabel('Assessment').fill('Synthetic upper respiratory infection');
  await page.getByRole('button', { name: 'Sign and complete visit' }).click();
  assert.match(await page.locator('.clinic-notice-error').textContent(), /real ID, phone number or email/);
  await page.getByLabel('Chief complaint').fill('Synthetic cough for three days');
  await page.getByLabel('SpO₂ %').fill('140');
  await page.getByRole('button', { name: 'Sign and complete visit' }).click();
  assert.match(await page.locator('.clinic-notice-error').textContent(), /vitals are outside/);
  await page.getByLabel('SpO₂ %').fill('98');
  await page.getByLabel('Heart rate /min').fill('72');
  await page.getByLabel('ICD-10 code (optional)').fill('J06.9');
  await page.getByRole('button', { name: 'Save draft' }).click();
  assert.match(await page.locator('.clinic-notice-ok').textContent(), /Draft saved/);
  await page.getByRole('button', { name: 'Sign and complete visit' }).click();
  assert.match(await page.locator('.clinic-notice-ok').textContent(), /Visit completed/);
  assert.match(await page.locator('.visit-done').textContent(), /Patient 042/);

  step = 'copy fhir'; await page.getByRole('button', { name: /Copy FHIR Encounter/ }).click();
  const fhir = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
  assert.equal(fhir.resourceType, 'Encounter');
  assert.equal(fhir.status, 'finished');
  assert.equal(fhir.meta.tag[0].code, 'synthetic');

  // 4. Overview: the details dialog really opens, shows the timeline, and closes.
  await nav('Overview');
  await page.locator('tbody tr', { hasText: 'Patient 042' }).getByRole('button', { name: 'View' }).click();
  await page.locator('dialog[open]').waitFor();
  assert.equal(await page.locator('dialog[open] .visit-timeline li').count(), 3, 'timeline: checked in, in consultation, completed');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog[open]').count(), 0, 'Escape closes the dialog');

  // 5. Arabic, right to left.
  step = 'goto ar'; await page.goto(`${BASE}/ar/bpr/clinic`);
  assert.equal(await page.evaluate(() => document.documentElement.dir), 'rtl');
  await page.locator('.clinic-sidebar nav').getByRole('button', { name: 'مكتب الاستقبال' }).click();
  assert.ok(await page.getByText('بيانات اصطناعية فقط').first().isVisible());
  await page.locator('.clinic-sidebar nav').getByRole('button', { name: 'غرفة الطبيب' }).click();
  assert.ok(await page.getByText('مكتمل اليوم').first().isVisible());

  assert.deepEqual(problems, [], 'no page errors or console errors');
  console.log('Clinic visit flow end-to-end check passed.');
} catch (error) {
  failed = error;
} finally {
  await browser.close();
}
if (failed) { console.error(failed); process.exitCode = 1; }
