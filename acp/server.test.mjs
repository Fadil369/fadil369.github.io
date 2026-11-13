import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAcpServer, configFromEnv } from './server.mjs';

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
