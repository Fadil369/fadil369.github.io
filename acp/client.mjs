import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { client, methods, ndJsonStream, PROTOCOL_VERSION } from '@agentclientprotocol/sdk';

const plugins = new Set(['clinical-copilot', 'clinical-research', 'healthcare-fhir', 'nphies-readiness', 'clinical-training']);
const root = resolve(import.meta.dirname, '..');

export const isClinicalPlugin = plugin => plugins.has(plugin);

// The Copilot CLI reports startup notices (disabled-tool lists, hook errors, local paths) as ordinary
// agent_message_chunk text, before the first model token. They must never reach end users.
const notice = /^(?:Info|Warning|Error): /;
export const isAgentNotice = text => notice.test(text);

export async function runPrompt({ prompt, plugin = 'clinical-copilot', onText = () => {}, onNotice = () => {}, onUpdate = () => {}, signal, agent = 'copilot', agentArgs = [], agentHome = process.env.ACP_AGENT_HOME }) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 8000) throw new Error('Prompt must contain 1–8000 characters.');
  if (!isClinicalPlugin(plugin)) throw new Error('Unknown clinical plugin.');
  if (signal?.aborted) throw new Error('Request cancelled.');

  if (agentHome !== undefined && (typeof agentHome !== 'string' || !isAbsolute(agentHome))) throw new Error('ACP_AGENT_HOME must be an absolute path.');
  const cwd = await mkdtemp(join(tmpdir(), 'bpr-acp-'));
  const args = [
    ...agentArgs, '--acp', '--disable-builtin-mcps', '--available-tools', 'skill', '--disallow-temp-dir',
    '--no-custom-instructions', '--no-auto-update', '--plugin-dir', join(root, 'plugins', plugin),
  ];
  const env = {};
  for (const key of ['PATH', 'HOME', 'USERPROFILE', 'SYSTEMROOT', 'TMPDIR', 'TEMP', 'TMP', 'COPILOT_HOME', 'COPILOT_GITHUB_TOKEN', 'GH_TOKEN', 'GITHUB_TOKEN']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  if (agentHome) {
    // A dedicated home keeps the operator's personal skills, plugins, MCP servers, hooks and instructions out of the agent.
    await mkdir(join(agentHome, '.copilot'), { recursive: true, mode: 0o700 });
    Object.assign(env, { HOME: agentHome, USERPROFILE: agentHome, COPILOT_HOME: join(agentHome, '.copilot') });
  }
  // Load only the selected clinical plugin; never auto-update the CLI or plugins; do not re-read login-shell state.
  Object.assign(env, { COPILOT_PLUGIN_DIR_ONLY: 'true', COPILOT_AUTO_UPDATE: 'false', COPILOT_DISABLE_LOGIN_SHELL_ENV: '1' });
  // On POSIX the agent leads its own process group so cancelling or timing out also stops what it started
  // (MCP servers, hook processes) instead of orphaning them.
  const grouped = process.platform !== 'win32';
  const child = spawn(agent, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'], detached: grouped });
  const kill = () => {
    try { if (grouped && child.pid) process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch { child.kill('SIGKILL'); }
  };
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4096); });
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; kill(); }, 120_000);
  const abort = () => kill();
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
          let started = false;
          for (;;) {
            const message = await session.nextUpdate();
            if (message.kind === 'stop') return { text, stopReason: message.stopReason };
            const update = message.update;
            onUpdate(update);
            if (update.sessionUpdate === 'agent_message_chunk' && update.content.type === 'text') {
              const chunk = update.content.text;
              if (!started && isAgentNotice(chunk)) { onNotice(chunk); continue; }
              started = true;
              text += chunk;
              if (text.length > 100_000) throw new Error('Agent response exceeded the size limit.');
              onText(chunk);
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
    kill();
    await new Promise(resolveExit => {
      if (child.exitCode !== null || child.signalCode !== null) resolveExit();
      else child.once('close', resolveExit);
    });
    await rm(cwd, { recursive: true, force: true });
  }
}
