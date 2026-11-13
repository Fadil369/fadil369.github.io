import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { runPrompt } from './client.mjs';

test('ACP client negotiates a session, denies tool permissions, and collects streamed text', async () => {
  let streamed = '';
  const response = await runPrompt({
    prompt: 'A fictional example',
    plugin: 'clinical-training',
    agent: process.execPath,
    agentArgs: [join(import.meta.dirname, 'fixtures/mock-agent.mjs')],
    onText: text => { streamed += text; },
  });
  assert.equal(streamed, 'Synthetic draft');
  assert.deepEqual(response, { text: 'Synthetic draft', stopReason: 'end_turn' });
});

test('ACP client rejects empty prompts and unknown plugins before launching an agent', async () => {
  await assert.rejects(runPrompt({ prompt: ' ' }), /Prompt/);
  await assert.rejects(runPrompt({ prompt: 'hello', plugin: '../other' }), /Unknown clinical plugin/);
});

test('ACP client reports launch failures and pre-cancelled requests', async () => {
  await assert.rejects(runPrompt({ prompt: 'fictional', agent: '/nonexistent-acp-agent' }), /ACP agent failed/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(runPrompt({ prompt: 'fictional', signal: controller.signal }), /cancelled/);
});
