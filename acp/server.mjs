import { createServer } from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isClinicalPlugin, runPrompt } from './client.mjs';

const webDir = join(import.meta.dirname, 'web');
const token = () => randomBytes(32).toString('base64url');
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const cookie = (name, value, maxAge) => `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
const jsonType = /^application\/json\s*(?:;\s*charset=utf-8\s*)?$/i;
// Log one short line only: never request bodies, prompts, tokens or stack traces.
const oneLine = value => String(value instanceof Error ? value.message : value).split('\n')[0].slice(0, 200);
const HOUR = 3_600_000;

export function configFromEnv(env) {
  if (!env.ACP_PUBLIC_URL) throw new Error('ACP_PUBLIC_URL is required: the public HTTPS origin, for example https://acp.example.org.');
  let base;
  try { base = new URL(env.ACP_PUBLIC_URL); } catch { throw new Error('ACP_PUBLIC_URL must be an HTTPS origin.'); }
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw new Error('ACP_PUBLIC_URL must be an HTTPS origin.');
  const allow = (env.ACP_ALLOWED_GITHUB_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!env.ACP_GITHUB_CLIENT_ID || !env.ACP_GITHUB_CLIENT_SECRET || !allow.length || allow.some(x => !/^[1-9]\d*$/.test(x))) {
    throw new Error('GitHub OAuth client ID, secret, and numeric user ID allowlist are required.');
  }
  const ratePerHour = env.ACP_RATE_PER_HOUR === undefined ? 20 : Number(env.ACP_RATE_PER_HOUR);
  if (!Number.isInteger(ratePerHour) || ratePerHour < 1 || ratePerHour > 1000) throw new Error('ACP_RATE_PER_HOUR must be an integer from 1 to 1000.');
  return { origin: base.origin, clientId: env.ACP_GITHUB_CLIENT_ID, clientSecret: env.ACP_GITHUB_CLIENT_SECRET, allow: new Set(allow), ratePerHour, agentHome: env.ACP_AGENT_HOME };
}

// The service spends the operator's Copilot entitlement for other people, so it must not run the agent in the
// operator's own home (personal skills, plugins, MCP servers, hooks, instructions) and must authenticate by token.
export function assertIsolatedAgentEnv(env) {
  if (!env.ACP_AGENT_HOME || !isAbsolute(env.ACP_AGENT_HOME)) throw new Error('ACP_AGENT_HOME must be an absolute path to a dedicated home directory for the agent.');
  if (env.HOME && resolve(env.ACP_AGENT_HOME) === resolve(env.HOME)) throw new Error('ACP_AGENT_HOME must differ from the service user HOME.');
  if (!(env.COPILOT_GITHUB_TOKEN || env.GH_TOKEN || env.GITHUB_TOKEN)) throw new Error('Set COPILOT_GITHUB_TOKEN so the service authenticates Copilot without a stored login.');
}

export function createAcpServer(config, { request = fetch, promptAgent = runPrompt, log = (event, detail) => console.error(`ACP ${event}${detail ? `: ${oneLine(detail)}` : ''}`) } = {}) {
  const oauth = new Map();
  const sessions = new Map();
  const usage = new Map();
  let busy = false;
  let active = null;
  const ratePerHour = config.ratePerHour ?? 20;
  const files = new Map([
    ['/', ['index.html', 'text/html; charset=utf-8']],
    ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
    ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ]);
  const sweep = () => {
    const now = Date.now();
    for (const [k, v] of oauth) if (v.expires <= now) oauth.delete(k);
    for (const [k, v] of sessions) if (v.expires <= now) sessions.delete(k);
    for (const [k, v] of usage) if (!v.some(t => t > now - HOUR)) usage.delete(k);
  };
  const headers = {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    'X-Frame-Options': 'DENY',
    'Strict-Transport-Security': 'max-age=31536000',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  };
  const send = (res, status, body, type = 'application/json; charset=utf-8', extra = {}) => {
    res.writeHead(status, { ...headers, 'Content-Type': type, ...extra });
    res.end(body);
  };
  const redirect = (res, url, cookies = []) => send(res, 303, '', 'text/plain', { Location: url, 'Set-Cookie': cookies });
  const parseCookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(x => x.trim().split('=')).filter(x => x.length === 2));
  const github = async (url, options) => {
    const response = await request(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error('GitHub authentication failed.');
    return response.json();
  };
  // Bounded in size and time so one slow or oversized upload cannot hold the single prompt slot.
  const readBody = async req => {
    const timer = setTimeout(() => req.destroy(new Error('Request body timed out.')), 10_000);
    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 16_000) return null;
      }
      return body;
    } finally {
      clearTimeout(timer);
    }
  };
  const server = createServer(async (req, res) => {
    try {
      sweep();
      const url = new URL(req.url, config.origin);
      const cookies = parseCookies(req);
      const session = sessions.get(cookies['__Host-bpr-acp']);
      if (req.method === 'GET' && url.pathname === '/healthz') return send(res, 200, '{"ok":true}');
      if (req.method === 'GET' && url.pathname === '/login') {
        if (oauth.size >= 1000) return send(res, 503, '{"error":"Too many login attempts."}');
        const state = token(), verifier = token();
        oauth.set(state, { verifier, expires: Date.now() + 600_000 });
        const authorize = new URL('https://github.com/login/oauth/authorize');
        authorize.search = new URLSearchParams({
          client_id: config.clientId, redirect_uri: `${config.origin}/callback`, state, allow_signup: 'false',
          code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256',
        });
        return redirect(res, authorize.toString(), [cookie('__Host-bpr-oauth', state, 600)]);
      }
      if (req.method === 'GET' && url.pathname === '/callback') {
        const state = url.searchParams.get('state');
        const login = oauth.get(state);
        oauth.delete(state);
        if (!login || !equal(state, cookies['__Host-bpr-oauth']) || !url.searchParams.get('code')) return send(res, 400, '{"error":"Invalid or expired login."}');
        const data = await github('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, code: url.searchParams.get('code'), redirect_uri: `${config.origin}/callback`, code_verifier: login.verifier }),
        });
        if (!data.access_token) throw new Error('GitHub authentication failed.');
        const user = await github('https://api.github.com/user', {
          headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${data.access_token}`, 'User-Agent': 'bpr-clinical-acp' },
        });
        if (!Number.isSafeInteger(user.id) || !config.allow.has(String(user.id))) {
          log('denied sign-in', `GitHub user id ${user.id} is not on the allowlist`);
          return send(res, 403, '{"error":"GitHub user is not allowed."}');
        }
        if (sessions.size >= 1000) return send(res, 503, '{"error":"Too many sessions."}');
        const id = token();
        sessions.set(id, { expires: Date.now() + 1_800_000, user: user.id });
        return redirect(res, '/', [cookie('__Host-bpr-oauth', '', 0), cookie('__Host-bpr-acp', id, 1800)]);
      }
      if (req.method === 'GET' && url.pathname === '/api/session') return send(res, 200, JSON.stringify({ authenticated: Boolean(session) }));
      if (req.method === 'POST' && url.pathname === '/logout') {
        if (req.headers.origin !== config.origin) return send(res, 403, '{"error":"Invalid origin."}');
        sessions.delete(cookies['__Host-bpr-acp']);
        return redirect(res, '/', [cookie('__Host-bpr-acp', '', 0)]);
      }
      if (req.method === 'POST' && url.pathname === '/api/prompt') {
        if (!session) return send(res, 401, '{"error":"Sign in first."}');
        if (req.headers.origin !== config.origin || !jsonType.test(req.headers['content-type'] || '')) return send(res, 403, '{"error":"Invalid request origin or content type."}');
        // Reserve the single prompt slot synchronously, before any await, so concurrent requests cannot both pass.
        if (busy) return send(res, 429, '{"error":"The service is busy. Try again later."}', undefined, { 'Retry-After': '30' });
        busy = true;
        try {
          const body = await readBody(req);
          if (body === null) return send(res, 413, '{"error":"Request too large."}');
          let input;
          try { input = JSON.parse(body); } catch { return send(res, 400, '{"error":"Invalid JSON."}'); }
          if (input?.synthetic !== true || typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 8000 || !isClinicalPlugin(input.plugin)) return send(res, 400, '{"error":"A synthetic prompt and known plugin are required."}');
          const now = Date.now();
          const recent = (usage.get(session.user) || []).filter(t => t > now - HOUR);
          if (recent.length >= ratePerHour) {
            log('rate limited', `user ${session.user}`);
            return send(res, 429, '{"error":"Hourly prompt limit reached. Try again later."}', undefined, { 'Retry-After': String(Math.ceil((recent[0] + HOUR - now) / 1000)) });
          }
          usage.set(session.user, [...recent, now]);
          const abort = new AbortController();
          active = abort;
          res.on('close', () => { if (!res.writableEnded) abort.abort(); });
          const output = await promptAgent({ prompt: input.prompt, plugin: input.plugin, signal: abort.signal, agentHome: config.agentHome, onNotice: notice => log('agent notice', notice) });
          // Explicit allowlist of response fields: agent internals must never reach the browser.
          const text = typeof output?.text === 'string' ? output.text : '';
          if (!text.trim()) {
            log('empty agent response', output?.stopReason);
            return send(res, 502, '{"error":"The agent returned no draft. Check service logs."}');
          }
          return send(res, 200, JSON.stringify({ text, stopReason: String(output.stopReason) }));
        } finally {
          active = null;
          busy = false;
        }
      }
      const file = files.get(url.pathname);
      if (req.method === 'GET' && file) return send(res, 200, await readFile(join(webDir, file[0])), file[1]);
      return send(res, 404, '{"error":"Not found."}');
    } catch (error) {
      log('request failed', error);
      if (!res.headersSent) send(res, 500, '{"error":"Request failed. Check service logs."}');
      else res.end();
    }
  });
  // Used for graceful shutdown: stop the in-flight agent (kills its child process) and drop connections.
  server.shutdown = () => { active?.abort(); server.close(); server.closeAllConnections?.(); };
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const config = configFromEnv(process.env);
    assertIsolatedAgentEnv(process.env);
    const port = Number(process.env.ACP_PORT || 8787);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid ACP_PORT.');
    const server = createAcpServer(config);
    server.listen(port, '127.0.0.1', () => console.log(`ACP service listening on 127.0.0.1:${port}; expose only through a configured HTTPS reverse proxy.`));
    for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { console.log(`ACP service stopping on ${signal}.`); server.shutdown(); });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
