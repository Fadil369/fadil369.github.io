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
  const nextWeekend = () => {
    for (let i = 1; i < 10; i++) {
      const iso = new Date(Date.now() + i * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
      if (new Date(`${iso}T12:00:00+03:00`).getDay() === 5) return iso; // Friday
    }
    throw new Error('no Friday found');
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

  // 4a. Reception rules, schedule settings, and the doctor workspace additions.
  step = 'reception rules'; await nav('Patient reception');
  await page.fill('input[type="date"]', nextWeekend());
  assert.match(await page.locator('.clinic-slot-form').textContent(), /No times available/, 'no slots on a Friday');
  const workday = nextWorkday();
  await page.fill('input[type="date"]', workday);
  assert.equal(await page.locator('.clinic-slot').count(), 24, 'default schedule offers 24 half-hour slots, 09:00 to 20:30');
  assert.equal(await page.locator('.clinic-slot').last().textContent(), '20:30');
  assert.equal(await page.locator('.clinic-slot.taken').count(), 1, 'the slot booked in step 1 is shown as taken');
  assert.equal(await page.locator('.clinic-slot.taken').first().isDisabled(), true, 'a taken slot cannot be chosen');

  // A booking made in another tab appears here as taken without a reload.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('brainsait_clinic_requests') || '[]').find((x) => x.patient === 'Patient 007'));
  await page.locator('.clinic-slot:not(.taken)').nth(3).click();
  const chosen = (await page.locator('.clinic-slot.selected').textContent()).trim();
  const other = await context.newPage();
  await other.goto(`${BASE}/bpr/clinic`);
  await other.evaluate(({ stored, chosen }) => {
    const list = JSON.parse(localStorage.getItem('brainsait_clinic_requests') || '[]');
    const at = new Date().toISOString();
    list.unshift({ ...stored, id: 'DEMO-RACE', reference: 'DEMO-RACE', patient: 'Patient 008', time: chosen, createdAt: at, history: [{ status: 'booked', at }] });
    localStorage.setItem('brainsait_clinic_requests', JSON.stringify(list));
  }, { stored, chosen });
  await other.close();
  await page.waitForFunction(() => document.querySelectorAll('.clinic-slot.taken').length === 2);
  assert.equal(await page.locator('.clinic-slot.selected').count(), 0, 'the choice is dropped when its time is taken elsewhere');

  // Schedule settings: validate, save, and the booking grid follows.
  step = 'schedule settings'; await nav('Clinic setup');
  const schedule = page.locator('section', { hasText: 'Booking schedule' });
  await schedule.getByLabel('Last visit ends').fill('08:00');
  await schedule.getByRole('button', { name: 'Save schedule' }).click();
  assert.match(await schedule.locator('.clinic-notice-error').textContent(), /Closing time must be after/);
  await schedule.getByLabel('Last visit ends').fill('12:00');
  await schedule.getByLabel('Visit length').selectOption('60');
  await schedule.getByRole('button', { name: 'Save schedule' }).click();
  assert.match(await schedule.locator('.clinic-notice-ok').textContent(), /Schedule saved/);
  await nav('Patient reception');
  await page.fill('input[type="date"]', workday);
  assert.deepEqual(await page.locator('.clinic-slot').allTextContents().then((a) => a.map((t) => t.slice(0, 5))), ['09:00', '10:00', '11:00'], '60-minute visits from 09:00 to 12:00');
  await page.evaluate(() => localStorage.removeItem('brainsait_clinic_schedule')); // back to the default for the rest of the run

  // Doctor workspace: history, plan lines, draft recovery, follow-up, FHIR bundle, print summary.
  step = 'doctor workspace'; await nav('Doctor room');
  await page.getByRole('button', { name: 'Call next patient' }).click();
  assert.match(await page.locator('.visit-patient-line').textContent(), /Patient 043/);
  assert.match(await page.locator('.visit-history summary').textContent(), /\(0\)/, 'no earlier visits for this patient');
  await page.getByLabel('Chief complaint').fill('Synthetic headache, two days');
  await page.getByLabel('Assessment').fill('Synthetic tension headache');
  await page.getByLabel('ICD-10 code (optional)').fill('R51');
  await page.getByLabel('Plan line').fill('Referral, id 1023456789');
  await page.getByRole('button', { name: /^Add line/ }).click();
  assert.match(await page.locator('.visit-order-add + [role="alert"], [role="alert"]').first().textContent(), /real ID, phone number or email/, 'a real identifier cannot be added as a plan line');
  await page.getByLabel('Type').selectOption('lab');
  await page.getByLabel('Plan line').fill('CBC and ESR (synthetic)');
  await page.getByLabel('Plan line').press('Enter');
  await page.getByLabel('Type').selectOption('medication');
  await page.getByLabel('Plan line').fill('Paracetamol 500 mg, draft');
  await page.getByRole('button', { name: /^Add line/ }).click();
  assert.equal(await page.locator('.visit-orders li').count(), 2, 'Enter and the button both add a line, and nothing was submitted');
  await page.getByLabel('Follow-up visit').selectOption('7');

  // The draft survives a reload; text with an identifier is never stored.
  await page.getByLabel('Plan').first().fill('Rest, fluids');
  await page.waitForTimeout(900);
  await page.reload(); await nav('Doctor room');
  assert.match(await page.locator('.clinic-notice-info[role="status"]').textContent(), /Restored your unsaved draft/);
  assert.equal(await page.getByLabel('Chief complaint').inputValue(), 'Synthetic headache, two days');
  assert.equal(await page.locator('.visit-orders li').count(), 2, 'plan lines come back with the draft');
  await page.getByLabel('Chief complaint').fill('Cough, national id 1023456789');
  await page.waitForTimeout(900);
  const stash = await page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith('brainsait_clinic_draft_')).map((k) => sessionStorage.getItem(k)).join(' '));
  assert.ok(!stash.includes('1023456789'), 'a note that trips the identifier check is not written to storage');
  await page.getByLabel('Chief complaint').fill('Synthetic headache, two days');

  await page.getByRole('button', { name: 'Sign and complete visit' }).click();
  const doneText = await page.locator('.clinic-notice-ok').textContent();
  assert.match(doneText, /Visit completed\. Follow-up booked: \d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  assert.equal(await page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith('brainsait_clinic_draft_')).length), 0, 'the draft is cleared once the visit is signed');
  await nav('Front desk');
  const follow = page.locator('tbody tr', { hasText: 'Patient 043' }).filter({ hasText: 'Booked' });
  assert.equal(await follow.count(), 1, 'the follow-up booking is in the front desk list');
  await nav('Doctor room');

  step = 'fhir bundle'; await page.getByRole('button', { name: /Copy FHIR Bundle.*Patient 043/ }).click();
  const bundle = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
  assert.equal(bundle.resourceType, 'Bundle');
  assert.equal(bundle.type, 'collection');
  const kinds = bundle.entry.map((e) => e.resource.resourceType);
  for (const need of ['Encounter', 'Condition', 'ServiceRequest', 'MedicationRequest']) assert.ok(kinds.includes(need), `bundle has a ${need}`);
  assert.ok(bundle.entry.every((e) => e.resource.meta?.tag?.some((t) => t.code === 'synthetic')), 'every resource is tagged synthetic');
  assert.ok(bundle.entry.every((e) => e.fullUrl.startsWith('http://example.invalid/')), 'no real server address in the bundle');

  step = 'print summary';
  await page.evaluate(() => { window.print = () => { window.__printed = true; }; });
  await page.getByRole('button', { name: /Print summary.*Patient 043/ }).click();
  await page.locator('.visit-print-root').waitFor({ state: 'attached' }); // hidden on screen, shown only for print
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('.visit-print-root').isVisible(), true, 'the summary is shown when printing');
  assert.equal(await page.locator('.clinic-sidebar').isVisible(), false, 'the app chrome is hidden when printing');
  const printed = await page.locator('.visit-print-root').innerText();
  assert.match(printed, /Patient 043/);
  assert.match(printed, /CBC and ESR/);
  assert.match(printed, /Follow-up booked/);
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await page.waitForFunction(() => !document.querySelector('.visit-print-root') && !document.body.classList.contains('printing-visit'));

  step = 'arabic additions'; await page.goto(`${BASE}/ar/bpr/clinic`);
  await page.locator('.clinic-sidebar nav').getByRole('button', { name: 'غرفة الطبيب' }).click();
  assert.ok(await page.getByRole('button', { name: /نسخ حزمة FHIR/ }).first().isVisible());
  assert.ok(await page.getByRole('button', { name: /طباعة الملخص/ }).first().isVisible());

  // 4b. A stored visit with a damaged date must not crash the page (regression).
  step = 'damaged storage'; await page.goto(`${BASE}/bpr/clinic`);
  await page.evaluate(() => localStorage.setItem('bs-lang', 'en')); // the Arabic check above leaves Arabic remembered, and the site opens the remembered language
  await page.goto(`${BASE}/bpr/clinic`);
  await page.evaluate(() => { localStorage.setItem('brainsait_clinic_requests', JSON.stringify([{ id: 'X', patient: 'Patient 001', status: 'booked', date: 'not-a-date' }])); });
  await page.reload();
  await nav('Overview'); await nav('Front desk'); await nav('Doctor room');

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
