import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createAcpServer, configFromEnv, assertIsolatedAgentEnv } from './server.mjs';

test('server requires HTTPS, OAuth credentials and a numeric allowlist', () => {
  assert.throws(() => configFromEnv({ ACP_PUBLIC_URL: 'http://example.test' }), /HTTPS/);
  assert.throws(() => configFromEnv({ ACP_PUBLIC_URL: 'https://example.test', ACP_GITHUB_CLIENT_ID: 'id', ACP_GITHUB_CLIENT_SECRET: 'secret', ACP_ALLOWED_GITHUB_IDS: 'alice' }), /numeric/);
});

test('OAuth PKCE, allowlist, origin checks and synthetic acknowledgement protect prompts', async t => {
  const calls = [];
  let userId = 123;
  const config = configFromEnv({ ACP_PUBLIC_URL: 'https://acp.example.test', ACP_GITHUB_CLIENT_ID: 'id', ACP_GITHUB_CLIENT_SECRET: 'secret', ACP_ALLOWED_GITHUB_IDS: '123' });
  const server = createAcpServer(config, {
    request: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => url.endsWith('/user') ? { id: userId } : { access_token: 'test-token' } };
    },
    promptAgent: async input => ({ text: `draft: ${input.prompt}`, stopReason: 'end_turn' }),
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const api = (path, options = {}) => fetch(base + path, { redirect: 'manual', ...options });

  assert.equal((await api('/api/prompt', { method: 'POST' })).status, 401);
  const login = await api('/login');
  const authorization = new URL(login.headers.get('location'));
  assert.equal(authorization.hostname, 'github.com');
  assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256');
  const state = authorization.searchParams.get('state');
  const oauthCookie = login.headers.getSetCookie()[0].split(';')[0];
  assert.equal((await api(`/callback?code=abc&state=${state}`)).status, 400);
  assert.equal((await api(`/callback?code=abc&state=${state}`, { headers: { Cookie: oauthCookie } })).status, 400);

  const login2 = await api('/login');
  const state2 = new URL(login2.headers.get('location')).searchParams.get('state');
  const callback = await api(`/callback?code=abc&state=${state2}`, { headers: { Cookie: login2.headers.getSetCookie()[0].split(';')[0] } });
  assert.equal(callback.status, 303);
  assert.ok(JSON.parse(calls[0].options.body).code_verifier);
  const sessionCookie = callback.headers.getSetCookie().find(x => x.startsWith('__Host-bpr-acp=')).split(';')[0];
  const options = { method: 'POST', headers: { Cookie: sessionCookie, Origin: config.origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'fictional', plugin: 'clinical-training', synthetic: true }) };
  assert.equal((await api('/api/prompt', { ...options, headers: { ...options.headers, Origin: 'https://attacker.test' } })).status, 403);
  assert.equal((await api('/api/prompt', { ...options, body: JSON.stringify({ prompt: 'fictional', plugin: 'clinical-training' }) })).status, 400);
  assert.equal((await api('/api/prompt', { ...options, body: JSON.stringify({ prompt: 'fictional', plugin: '../other', synthetic: true }) })).status, 400);
  const response = await api('/api/prompt', options);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { text: 'draft: fictional', stopReason: 'end_turn' });
  assert.equal((await api('/logout', { method: 'POST', headers: { Cookie: sessionCookie, Origin: config.origin } })).status, 303);
  assert.equal((await api('/api/prompt', options)).status, 401);

  userId = 456;
  const login3 = await api('/login');
  const state3 = new URL(login3.headers.get('location')).searchParams.get('state');
  assert.equal((await api(`/callback?code=abc&state=${state3}`, { headers: { Cookie: login3.headers.getSetCookie()[0].split(';')[0] } })).status, 403);
});

const baseEnv = { ACP_PUBLIC_URL: 'https://acp.example.test', ACP_GITHUB_CLIENT_ID: 'id', ACP_GITHUB_CLIENT_SECRET: 'secret', ACP_ALLOWED_GITHUB_IDS: '123', ACP_AGENT_HOME: '/srv/agent-home' };

// Signs in through the mocked GitHub flow and returns helpers for authenticated prompt requests.
async function harness(t, { promptAgent, ratePerHour } = {}) {
  const logs = [];
  const config = configFromEnv({ ...baseEnv, ...(ratePerHour ? { ACP_RATE_PER_HOUR: String(ratePerHour) } : {}) });
  const server = createAcpServer(config, {
    request: async url => ({ ok: true, json: async () => url.endsWith('/user') ? { id: 123 } : { access_token: 'test-token' } }),
    promptAgent: promptAgent || (async () => ({ text: 'draft', stopReason: 'end_turn' })),
    log: (event, detail) => logs.push([event, detail]),
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const api = (path, options = {}) => fetch(`http://127.0.0.1:${server.address().port}${path}`, { redirect: 'manual', ...options });
  const login = await api('/login');
  const state = new URL(login.headers.get('location')).searchParams.get('state');
  const callback = await api(`/callback?code=abc&state=${state}`, { headers: { Cookie: login.headers.getSetCookie()[0].split(';')[0] } });
  const session = callback.headers.getSetCookie().find(x => x.startsWith('__Host-bpr-acp=')).split(';')[0];
  const prompt = (body = { prompt: 'fictional', plugin: 'clinical-training', synthetic: true }, headers = {}) => api('/api/prompt', {
    method: 'POST', headers: { Cookie: session, Origin: config.origin, 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { api, prompt, logs, config, port: server.address().port, session };
}

test('health endpoint and security headers are served without authentication', async t => {
  const { api } = await harness(t);
  const health = await api('/healthz');
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true });
  for (const name of ['strict-transport-security', 'content-security-policy', 'x-content-type-options', 'cross-origin-opener-policy', 'permissions-policy']) assert.ok(health.headers.get(name), name);
  assert.equal(health.headers.get('cache-control'), 'no-store');
});

test('sign-in requests no OAuth scope, disables signup and uses the registered callback', async t => {
  const { api } = await harness(t);
  const authorize = new URL((await api('/login')).headers.get('location'));
  assert.equal(authorize.searchParams.get('redirect_uri'), 'https://acp.example.test/callback');
  assert.equal(authorize.searchParams.get('allow_signup'), 'false');
  assert.equal(authorize.searchParams.has('scope'), false);
});

test('only one prompt runs at a time even when requests arrive together, and the slot is released', async t => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let running = 0, peak = 0;
  const { prompt } = await harness(t, { promptAgent: async () => { running++; peak = Math.max(peak, running); await gate; running--; return { text: 'ok', stopReason: 'end_turn' }; } });
  const first = prompt(), second = prompt();
  const early = await Promise.race([first, second]);
  assert.equal(early.status, 429);
  assert.ok(early.headers.get('retry-after'));
  release();
  assert.deepEqual([(await first).status, (await second).status].sort(), [200, 429]);
  assert.equal(peak, 1);
  assert.equal((await prompt()).status, 200);
});

test('the prompt slot is reserved before the body is read, so a slow upload cannot be overtaken', async t => {
  let runs = 0;
  const { prompt, config, port, session } = await harness(t, { promptAgent: async () => { runs++; await new Promise(resolve => setTimeout(resolve, 20)); return { text: 'ok', stopReason: 'end_turn' }; } });
  const body = JSON.stringify({ prompt: 'fictional', plugin: 'clinical-training', synthetic: true });
  let finish;
  const slow = new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: '/api/prompt', method: 'POST', headers: { Cookie: session, Origin: config.origin, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', reject);
    req.write(body.slice(0, 10));
    finish = () => req.end(body.slice(10));
  });
  await new Promise(resolve => setTimeout(resolve, 150)); // the server is now waiting on the first request's body
  assert.equal((await prompt()).status, 429);
  finish();
  assert.equal(await slow, 200);
  assert.equal(runs, 1);
});

test('a rejected or oversized request does not leak the prompt slot', async t => {
  const { prompt } = await harness(t);
  assert.equal((await prompt('x'.repeat(17_000))).status, 413);
  assert.equal((await prompt('not json')).status, 400);
  assert.equal((await prompt()).status, 200);
});

test('each signed-in user has an hourly prompt budget', async t => {
  const { prompt, logs } = await harness(t, { ratePerHour: 2 });
  assert.equal((await prompt()).status, 200);
  assert.equal((await prompt()).status, 200);
  const limited = await prompt();
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  assert.ok(logs.some(([event]) => event === 'rate limited'));
});

test('agent internals never reach the browser: response fields are allowlisted and notices are only logged', async t => {
  let seen;
  const { prompt, logs } = await harness(t, {
    promptAgent: async input => {
      seen = input;
      input.onNotice('Info: Disabled tools: oracle-secret_tool at /Users/operator/.npm');
      return { text: 'draft', stopReason: 'end_turn', notices: ['leak'], token: 'abc', cwd: '/tmp/x' };
    },
  });
  const response = await prompt();
  const raw = await response.text();
  assert.deepEqual(JSON.parse(raw), { text: 'draft', stopReason: 'end_turn' });
  assert.doesNotMatch(raw, /oracle-secret|operator|leak|abc|\/tmp/);
  assert.equal(seen.agentHome, '/srv/agent-home');
  assert.ok(logs.some(([event, detail]) => event === 'agent notice' && /oracle-secret/.test(detail)));
});

test('an empty agent response is a 502, not an empty success', async t => {
  const { prompt, logs } = await harness(t, { promptAgent: async () => ({ text: '  ', stopReason: 'end_turn' }) });
  assert.equal((await prompt()).status, 502);
  assert.ok(logs.some(([event]) => event === 'empty agent response'));
});

test('JSON content type may carry a charset, other types are refused', async t => {
  const { prompt } = await harness(t);
  assert.equal((await prompt(undefined, { 'Content-Type': 'application/json; charset=utf-8' })).status, 200);
  assert.equal((await prompt(undefined, { 'Content-Type': 'text/plain' })).status, 403);
});

test('agent failures are logged as one short line without the prompt', async t => {
  const { prompt, logs } = await harness(t, { promptAgent: async () => { throw new Error('ACP agent failed: Authentication required\nsecret stderr with prompt text'); } });
  const response = await prompt();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'Request failed. Check service logs.' });
  const [event, detail] = logs.at(-1);
  assert.equal(event, 'request failed');
  assert.match(detail.message, /Authentication required/);
});

test('configuration reports clear errors and enforces an isolated agent environment', () => {
  assert.throws(() => configFromEnv({}), /ACP_PUBLIC_URL is required/);
  assert.throws(() => configFromEnv({ ...baseEnv, ACP_PUBLIC_URL: 'not a url' }), /HTTPS origin/);
  for (const bad of ['0', '1001', 'abc', '1.5']) assert.throws(() => configFromEnv({ ...baseEnv, ACP_RATE_PER_HOUR: bad }), /ACP_RATE_PER_HOUR/);
  assert.equal(configFromEnv(baseEnv).ratePerHour, 20);
  const good = { ACP_AGENT_HOME: '/var/lib/bpr-acp', HOME: '/home/svc', COPILOT_GITHUB_TOKEN: 'token' };
  assert.doesNotThrow(() => assertIsolatedAgentEnv(good));
  assert.throws(() => assertIsolatedAgentEnv({ ...good, ACP_AGENT_HOME: undefined }), /ACP_AGENT_HOME/);
  assert.throws(() => assertIsolatedAgentEnv({ ...good, ACP_AGENT_HOME: 'relative' }), /absolute/);
  assert.throws(() => assertIsolatedAgentEnv({ ...good, ACP_AGENT_HOME: '/home/svc' }), /differ/);
  assert.throws(() => assertIsolatedAgentEnv({ ...good, COPILOT_GITHUB_TOKEN: undefined }), /COPILOT_GITHUB_TOKEN/);
});

test('a client that disconnects cancels the agent, frees the slot, and is not logged as a failure', async t => {
  let calls = 0, sawAbort = false;
  const { api, config, session, logs, prompt } = await harness(t, {
    promptAgent: ({ signal }) => {
      if (++calls > 1) return Promise.resolve({ text: 'ok', stopReason: 'end_turn' });
      return new Promise((_, reject) => signal.addEventListener('abort', () => { sawAbort = true; reject(new Error('Request cancelled.')); }));
    },
  });
  const controller = new AbortController();
  const pending = api('/api/prompt', {
    method: 'POST', signal: controller.signal,
    headers: { Cookie: session, Origin: config.origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'fictional', plugin: 'clinical-training', synthetic: true }),
  });
  pending.catch(() => {});
  while (calls === 0) await new Promise(resolve => setTimeout(resolve, 10));
  controller.abort();
  while (!sawAbort) await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal((await prompt()).status, 200);
  assert.ok(logs.some(([event]) => event === 'prompt cancelled by client'));
  assert.ok(!logs.some(([event]) => event === 'request failed'));
});
