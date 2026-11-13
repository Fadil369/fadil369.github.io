import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import vm from 'node:vm';

// A minimal DOM: enough to run the real acp/web/app.js and observe what it does to the page.
const element = id => {
  const listeners = {};
  return {
    id, hidden: false, disabled: false, textContent: '', className: '', value: '', checked: true,
    addEventListener: (type, fn) => (listeners[type] ||= []).push(fn),
    fire: async (type, event = { preventDefault() {} }) => { for (const fn of listeners[type] || []) await fn(event); },
  };
};
const settle = () => new Promise(resolve => setTimeout(resolve, 20));
const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
const abortError = () => Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });

async function boot(fetchImpl, navigator = {}) {
  const els = Object.fromEntries(['identity', 'form', 'status', 'result', 'submit', 'cancel', 'login', 'logout', 'prompt', 'plugin', 'ack', 'copy', 'count', 'hint'].map(id => [id, element(id)]));
  els.cancel.hidden = true;
  els.copy.hidden = true;
  els.prompt.value = 'fictional';
  els.plugin.value = 'clinical-training';
  vm.runInNewContext(await readFile(join(import.meta.dirname, 'web/app.js'), 'utf8'), { document: { getElementById: id => els[id] }, fetch: fetchImpl, navigator, AbortController, Error, JSON, Promise });
  await settle();
  return els;
}

test('signed-out visitors see the sign-in link and no prompt form', async () => {
  const els = await boot(async () => json(200, { authenticated: false }));
  assert.equal(els.login.hidden, false);
  assert.equal(els.form.hidden, true);
  assert.equal(els.logout.hidden, true);
});

test('a prompt shows the draft and restores the controls', async () => {
  const els = await boot(async url => url === '/api/session' ? json(200, { authenticated: true }) : json(200, { text: 'draft', stopReason: 'end_turn' }));
  assert.equal(els.form.hidden, false);
  await els.form.fire('submit');
  assert.equal(els.result.textContent, 'draft');
  assert.equal(els.status.textContent, 'Finished: end_turn');
  assert.equal(els.submit.disabled, false);
  assert.equal(els.cancel.hidden, true);
});

test('an expired session returns the visitor to sign-in instead of a dead end', async () => {
  let authenticated = true;
  const els = await boot(async url => url === '/api/session' ? json(200, { authenticated }) : (authenticated = false, json(401, { error: 'Sign in first.' })));
  assert.equal(els.form.hidden, false);
  await els.form.fire('submit');
  assert.match(els.status.textContent, /session expired/i);
  assert.equal(els.form.hidden, true);
  assert.equal(els.login.hidden, false);
});

test('Cancel aborts the in-flight request and says so', async () => {
  const els = await boot((url, options) => url === '/api/session'
    ? Promise.resolve(json(200, { authenticated: true }))
    : new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(abortError()))));
  const run = els.form.fire('submit');
  await settle();
  assert.equal(els.cancel.hidden, false);
  assert.equal(els.submit.disabled, true);
  await els.cancel.fire('click');
  await run;
  assert.equal(els.status.textContent, 'Cancelled.');
  assert.equal(els.submit.disabled, false);
  assert.equal(els.cancel.hidden, true);
});

test('server and proxy errors are reported readably, including non-JSON bodies', async () => {
  const bodies = [
    () => json(429, { error: 'The service is busy. Try again later.' }),
    () => ({ ok: false, status: 502, json: async () => { throw new SyntaxError('Unexpected token <'); } }),
  ];
  let i = 0;
  const els = await boot(async url => url === '/api/session' ? json(200, { authenticated: true }) : bodies[i++]());
  await els.form.fire('submit');
  assert.equal(els.status.textContent, 'Request failed: The service is busy. Try again later.');
  await els.form.fire('submit');
  assert.equal(els.status.textContent, 'Request failed: Request failed (HTTP 502).');
});

test('the character counter tracks the prompt and the plugin hint follows the selection', async () => {
  const els = await boot(async () => json(200, { authenticated: true }));
  assert.equal(els.count.textContent, '9 / 8000');
  assert.match(els.hint.textContent, /Fictional communication/);
  els.prompt.value = 'x'.repeat(8001); // beyond the limit, e.g. set programmatically
  await els.prompt.fire('input');
  assert.equal(els.count.textContent, '8001 / 8000');
  assert.equal(els.count.className, 'hint over');
  assert.equal(els.submit.disabled, true);
  els.prompt.value = 'short';
  await els.prompt.fire('input');
  assert.equal(els.submit.disabled, false);
  els.plugin.value = 'healthcare-fhir';
  await els.plugin.fire('change');
  assert.match(els.hint.textContent, /FHIR R4/);
});

test('Copy appears with a draft, copies exactly the draft, and degrades without clipboard access', async () => {
  const copied = [];
  const ok = { clipboard: { writeText: async text => { copied.push(text); } } };
  const els = await boot(async url => url === '/api/session' ? json(200, { authenticated: true }) : json(200, { text: 'the draft', stopReason: 'end_turn' }), ok);
  assert.equal(els.copy.hidden, true);
  await els.form.fire('submit');
  assert.equal(els.copy.hidden, false);
  await els.copy.fire('click');
  assert.deepEqual(copied, ['the draft']);
  assert.equal(els.status.textContent, 'Draft copied.');

  const none = await boot(async url => url === '/api/session' ? json(200, { authenticated: true }) : json(200, { text: 'd', stopReason: 'end_turn' }), {});
  await none.form.fire('submit');
  await none.copy.fire('click');
  assert.match(none.status.textContent, /Copy is not available/);
});

test('a failed or cancelled run hides Copy and leaves no stale draft', async () => {
  let fail = false;
  const els = await boot(async url => url === '/api/session' ? json(200, { authenticated: true }) : fail ? json(500, { error: 'boom' }) : json(200, { text: 'draft', stopReason: 'end_turn' }));
  await els.form.fire('submit');
  assert.equal(els.copy.hidden, false);
  fail = true;
  await els.form.fire('submit');
  assert.equal(els.copy.hidden, true);
  assert.equal(els.result.textContent, '');
  assert.match(els.status.textContent, /boom/);
});

test('Sign out posts with fetch (so the real Origin is sent), clears the draft and returns to sign-in', async () => {
  let authenticated = true;
  const calls = [];
  const els = await boot(async (url, options = {}) => {
    calls.push([options.method || 'GET', url]);
    if (url === '/logout') { authenticated = false; return json(200, {}); }
    return url === '/api/session' ? json(200, { authenticated }) : json(200, { text: 'draft', stopReason: 'end_turn' });
  });
  await els.form.fire('submit');
  assert.equal(els.result.textContent, 'draft');
  await els.logout.fire('submit');
  assert.ok(calls.some(([method, url]) => method === 'POST' && url === '/logout'));
  assert.equal(els.result.textContent, '');
  assert.equal(els.copy.hidden, true);
  assert.equal(els.form.hidden, true);
  assert.equal(els.login.hidden, false);
});

test('a failed sign-out request says so instead of pretending to succeed', async () => {
  const els = await boot(async url => { if (url === '/logout') throw new Error('network'); return json(200, { authenticated: true }); });
  await els.logout.fire('submit');
  assert.match(els.status.textContent, /Sign-out failed/);
  assert.equal(els.form.hidden, false);
});
