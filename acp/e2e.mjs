// Manual browser end-to-end check of the ACP web UI. Not part of CI (needs a browser).
//
//   npm run test:acp:e2e
//   ACP_E2E_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test:acp:e2e
//   ACP_E2E_SCREENSHOT=/tmp/acp.png npm run test:acp:e2e
//
// Runs the real server and the real UI in a real browser. Only the outside world is mocked: GitHub's OAuth
// pages are intercepted (the browser is bounced straight back to /callback) and the agent returns a fixed draft.
// It checks sign-in, the page's CSP (no console errors), HttpOnly session cookies, prompt, Copy and sign-out.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createAcpServer } from './server.mjs';

const config = { origin: '', clientId: 'id', clientSecret: 'secret', allow: new Set(['123']), ratePerHour: 20 };
const server = createAcpServer(config, {
  request: async url => ({ ok: true, json: async () => url.endsWith('/user') ? { id: 123 } : { access_token: 'test-token' } }),
  promptAgent: async ({ prompt, plugin }) => ({ text: `draft [${plugin}]: ${prompt}`, stopReason: 'end_turn' }),
  log: () => {},
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
config.origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ executablePath: process.env.ACP_E2E_CHROME || undefined });
let failed;
try {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  // The browser must never reach the real GitHub. Playwright does not route redirect hops, so the OAuth handshake is
  // driven through the context's request API (which shares the browser's cookie jar) instead of letting the page follow
  // /login's redirect. Any direct browser request to GitHub is still aborted as a guard.
  await context.route(url => url.hostname === 'github.com' || url.hostname.endsWith('.github.com'), route => route.abort());
  const page = await context.newPage();
  const problems = [];
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) problems.push(`${message.type()}: ${message.text()}`); });
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`));

  await page.goto(config.origin);
  await page.getByRole('link', { name: 'Sign in with GitHub' }).waitFor();
  assert.equal(await page.locator('#form').isVisible(), false, 'prompt form is hidden before sign-in');

  // Sign in: /login must redirect to GitHub with PKCE and a state cookie; then return through /callback with that state.
  const login = await context.request.get(`${config.origin}/login`, { maxRedirects: 0 });
  assert.equal(login.status(), 303);
  const authorize = new URL(login.headers().location);
  assert.equal(authorize.origin + authorize.pathname, 'https://github.com/login/oauth/authorize');
  assert.equal(authorize.searchParams.get('code_challenge_method'), 'S256');
  const callback = await context.request.get(`${config.origin}/callback?code=abc&state=${authorize.searchParams.get('state')}`, { maxRedirects: 0 });
  assert.equal(callback.status(), 303);
  await page.reload();
  await page.locator('#form').waitFor();
  assert.match(await page.locator('#identity').textContent(), /Signed in/);
  assert.equal(await page.evaluate(() => document.cookie), '', 'session cookies are HttpOnly');

  assert.match(await page.locator('#hint').textContent(), /\S/, 'plugin hint is shown');
  await page.selectOption('#plugin', 'healthcare-fhir');
  assert.match(await page.locator('#hint').textContent(), /FHIR R4/);
  await page.fill('#prompt', 'Map a fictional encounter.');
  assert.equal((await page.locator('#count').textContent()).trim(), '26 / 8000');

  await page.getByRole('button', { name: 'Run' }).click(); // required confirmation box blocks submission until checked
  assert.equal(await page.locator('#result').textContent(), '', 'the confirmation checkbox is required');
  await page.check('#ack');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.waitForFunction(() => document.getElementById('result').textContent.length > 0);
  assert.equal(await page.locator('#result').textContent(), 'draft [healthcare-fhir]: Map a fictional encounter.');
  assert.match(await page.locator('#status').textContent(), /Finished: end_turn/);

  await page.getByRole('button', { name: 'Copy draft' }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'draft [healthcare-fhir]: Map a fictional encounter.');

  if (process.env.ACP_E2E_SCREENSHOT) await page.screenshot({ path: process.env.ACP_E2E_SCREENSHOT, fullPage: true });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('link', { name: 'Sign in with GitHub' }).waitFor();
  assert.equal(await page.locator('#form').isVisible(), false, 'signing out hides the prompt form');

  assert.deepEqual(problems, [], 'no console errors or CSP violations');
  console.log('ACP web UI end-to-end check passed.');
} catch (error) {
  failed = error;
} finally {
  await browser.close();
  server.closeAllConnections();
  server.close();
}
if (failed) { console.error(failed); process.exitCode = 1; }
