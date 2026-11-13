import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDesktopHandlers } from './desktop/handler.mjs';

const trusted = { sender: 'window', senderFrame: 'main' };
const untrusted = { sender: 'other', senderFrame: 'main' };
const isTrusted = event => event.sender === 'window';
const input = { prompt: 'fictional', plugin: 'clinical-training', synthetic: true };

test('only the app window may prompt or cancel', async () => {
  const handlers = createDesktopHandlers({ isTrusted, run: async () => ({ text: 'x', stopReason: 'end_turn' }) });
  await assert.rejects(handlers.prompt(untrusted, input), /Invalid sender/);
  assert.throws(() => handlers.cancel(untrusted), /Invalid sender/);
});

test('the synthetic-data confirmation is enforced in the main process, not only in the page', async () => {
  let ran = false;
  const handlers = createDesktopHandlers({ isTrusted, run: async () => { ran = true; return { text: 'x', stopReason: 'end_turn' }; } });
  for (const bad of [undefined, {}, { ...input, synthetic: false }, { ...input, synthetic: 'true' }]) await assert.rejects(handlers.prompt(trusted, bad), /no real or potentially real/);
  assert.equal(ran, false);
});

test('one request at a time, released afterwards, and only text and stopReason are returned', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let calls = 0;
  const handlers = createDesktopHandlers({ isTrusted, run: async () => { calls++; await gate; return { text: 'draft', stopReason: 'end_turn', secret: 'x' }; } });
  const first = handlers.prompt(trusted, input);
  await assert.rejects(handlers.prompt(trusted, input), /already running/);
  release();
  assert.deepEqual(await first, { text: 'draft', stopReason: 'end_turn' });
  assert.deepEqual(await handlers.prompt(trusted, input), { text: 'draft', stopReason: 'end_turn' });
  assert.equal(calls, 2);
});

test('cancel and shutdown abort the running agent; the slot is released on failure', async () => {
  const signals = [];
  const handlers = createDesktopHandlers({
    isTrusted,
    run: ({ signal }) => { signals.push(signal); return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('Request cancelled.')))); },
  });
  const first = handlers.prompt(trusted, input);
  handlers.cancel(trusted);
  await assert.rejects(first, /cancelled/);
  assert.equal(signals[0].aborted, true);
  const second = handlers.prompt(trusted, input);
  handlers.shutdown();
  await assert.rejects(second, /cancelled/);
  assert.equal(signals[1].aborted, true);
  handlers.cancel(trusted); // nothing running: harmless
});
