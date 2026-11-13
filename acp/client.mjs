import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { client, methods, ndJsonStream, PROTOCOL_VERSION } from '@agentclientprotocol/sdk';

const plugins = new Set(['clinical-copilot', 'clinical-research', 'healthcare-fhir', 'nphies-readiness', 'clinical-training']);
const root = resolve(import.meta.dirname, '..');

export const isClinicalPlugin = plugin => plugins.has(plugin);

export async function runPrompt({ prompt, plugin = 'clinical-copilot', onText = () => {}, signal, agent = 'copilot', agentArgs = [] }) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 8000) throw new Error('Prompt must contain 1–8000 characters.');
  if (!isClinicalPlugin(plugin)) throw new Error('Unknown clinical plugin.');
  if (signal?.aborted) throw new Error('Request cancelled.');

  const cwd = await mkdtemp(join(tmpdir(), 'bpr-acp-'));
  const args = [...agentArgs, '--acp', '--disable-builtin-mcps', '--available-tools', 'skill', '--disallow-temp-dir', '--plugin-dir', join(root, 'plugins', plugin)];
  const env = {};
  for (const key of ['PATH', 'HOME', 'USERPROFILE', 'SYSTEMROOT', 'TMPDIR', 'TEMP', 'TMP', 'COPILOT_HOME', 'COPILOT_GITHUB_TOKEN', 'GH_TOKEN', 'GITHUB_TOKEN']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  const child = spawn(agent, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4096); });
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 120_000);
  const abort = () => child.kill('SIGKILL');
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  try {
    await new Promise((ok, fail) => {
      child.once('spawn', ok);
      child.once('error', fail);
    });
    const stream = ndJsonStream(Writable.toWeb(child.stdin), Readable.toWeb(child.stdout));
    const result = await client({ name: 'bpr-clinical-acp' })
      .onRequest(methods.client.session.requestPermission, () => ({ outcome: { outcome: 'cancelled' } }))
      .connectWith(stream, async context => {
        const init = await context.request(methods.agent.initialize, {
          protocolVersion: PROTOCOL_VERSION,
          clientCapabilities: {},
          clientInfo: { name: 'bpr-clinical-acp', version: '1.0.0' },
        });
        if (init.protocolVersion !== PROTOCOL_VERSION) throw new Error(`Unsupported ACP protocol version: ${init.protocolVersion}`);
        return context.buildSession({ cwd, mcpServers: [] }).withSession(async session => {
          session.prompt(prompt);
          let text = '';
          for (;;) {
            const message = await session.nextUpdate();
            if (message.kind === 'stop') return { text, stopReason: message.stopReason };
            const update = message.update;
            if (update.sessionUpdate === 'agent_message_chunk' && update.content.type === 'text') {
              text += update.content.text;
              if (text.length > 100_000) throw new Error('Agent response exceeded the size limit.');
              onText(update.content.text);
            }
          }
        });
      });
    return result;
  } catch (error) {
    if (signal?.aborted) throw new Error('Request cancelled.');
    if (timedOut) throw new Error('ACP agent timed out.');
    throw new Error(`ACP agent failed: ${error.message}${stderr ? `\n${stderr}` : ''}`);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
    child.kill('SIGKILL');
    await new Promise(resolveExit => {
      if (child.exitCode !== null || child.signalCode !== null) resolveExit();
      else child.once('close', resolveExit);
    });
    await rm(cwd, { recursive: true, force: true });
  }
}
