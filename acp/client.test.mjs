import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isAgentNotice, runPrompt } from './client.mjs';

const mock = { agent: process.execPath, agentArgs: [join(import.meta.dirname, 'fixtures/mock-agent.mjs')] };

test('ACP client negotiates a session, denies tool permissions, and collects streamed text', async () => {
  let streamed = '';
  const response = await runPrompt({
    prompt: 'A fictional example',
    plugin: 'clinical-training',
    ...mock,
    onText: text => { streamed += text; },
  });
  assert.equal(streamed, 'Synthetic draft');
  assert.deepEqual(response, { text: 'Synthetic draft', stopReason: 'end_turn' });
});

test('ACP client rejects empty prompts and unknown plugins before launching an agent', async () => {
  await assert.rejects(runPrompt({ prompt: ' ' }), /Prompt/);
  await assert.rejects(runPrompt({ prompt: 'hello', plugin: '../other' }), /Unknown clinical plugin/);
  await assert.rejects(runPrompt({ prompt: 'hello', agentHome: 'relative/home' }), /absolute path/);
});

test('ACP client reports launch failures and pre-cancelled requests', async () => {
  await assert.rejects(runPrompt({ prompt: 'fictional', agent: '/nonexistent-acp-agent' }), /ACP agent failed/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(runPrompt({ prompt: 'fictional', signal: controller.signal }), /cancelled/);
});

test('agent startup notices never reach the response or onText, only onNotice', async () => {
  const notices = [];
  let streamed = '';
  const response = await runPrompt({ prompt: 'fictional NOTICES', plugin: 'clinical-training', ...mock, onNotice: n => notices.push(n), onText: t => { streamed += t; } });
  assert.deepEqual(response, { text: 'Synthetic draft', stopReason: 'end_turn' });
  assert.equal(streamed, 'Synthetic draft');
  assert.equal(notices.length, 2);
  assert.match(notices[0], /^Info: Disabled tools/);
  assert.doesNotMatch(response.text, /secret-operator|\/Users\/operator/);
});

test('only leading chunks are treated as notices; a model answer containing "Info: " is kept', async () => {
  const response = await runPrompt({ prompt: 'fictional LATE_INFO', plugin: 'clinical-training', ...mock });
  assert.equal(response.text, 'Answer: Info: this is part of the model answer');
  assert.ok(isAgentNotice('Warning: x') && isAgentNotice('Error: x') && !isAgentNotice('Hello') && !isAgentNotice('  Info: x'));
});

test('the agent is launched isolated: one plugin, no custom instructions, no auto-update, scrubbed environment', async () => {
  process.env.ACP_TEST_CANARY = 'must-not-be-forwarded';
  const home = await mkdtemp(join(tmpdir(), 'acp-home-'));
  try {
    const { text } = await runPrompt({ prompt: 'fictional ECHO', plugin: 'clinical-training', ...mock, agentHome: home });
    const { argv, env } = JSON.parse(text);
    for (const flag of ['--acp', '--disable-builtin-mcps', '--disallow-temp-dir', '--no-custom-instructions', '--no-auto-update']) assert.ok(argv.includes(flag), flag);
    assert.equal(argv[argv.indexOf('--available-tools') + 1], 'skill');
    assert.match(argv[argv.indexOf('--plugin-dir') + 1], /plugins[\\/]clinical-training$/);
    assert.equal(env.COPILOT_PLUGIN_DIR_ONLY, 'true');
    assert.equal(env.COPILOT_AUTO_UPDATE, 'false');
    assert.equal(env.COPILOT_DISABLE_LOGIN_SHELL_ENV, '1');
    assert.equal(env.HOME, home);
    assert.equal(env.COPILOT_HOME, join(home, '.copilot'));
    assert.equal(env.ACP_TEST_CANARY, null);
    assert.deepEqual(await readdir(home), ['.copilot']);
  } finally {
    delete process.env.ACP_TEST_CANARY;
    await rm(home, { recursive: true, force: true });
  }
});
