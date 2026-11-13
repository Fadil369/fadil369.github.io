import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import vm from 'node:vm';

// A minimal DOM: enough to run the real acp/web/app.js and observe what it does to the page.
const element = id => {
  const listeners = {};
  return {
    id, hidden: false, disabled: false, textContent: '', value: '', checked: true,
    addEventListener: (type, fn) => (listeners[type] ||= []).push(fn),
    fire: async (type, event = { preventDefault() {} }) => { for (const fn of listeners[type] || []) await fn(event); },
  };
};
const settle = () => new Promise(resolve => setTimeout(resolve, 20));
const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
const abortError = () => Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });

async function boot(fetchImpl) {
  const els = Object.fromEntries(['identity', 'form', 'status', 'result', 'submit', 'cancel', 'login', 'logout', 'prompt', 'plugin', 'ack'].map(id => [id, element(id)]));
  els.cancel.hidden = true;
  els.prompt.value = 'fictional';
  els.plugin.value = 'clinical-training';
  vm.runInNewContext(await readFile(join(import.meta.dirname, 'web/app.js'), 'utf8'), { document: { getElementById: id => els[id] }, fetch: fetchImpl, AbortController, Error, JSON, Promise });
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
