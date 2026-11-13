import { createServer } from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isClinicalPlugin, runPrompt } from './client.mjs';

const webDir = join(import.meta.dirname, 'web');
const token = () => randomBytes(32).toString('base64url');
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const cookie = (name, value, maxAge) => `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;

export function configFromEnv(env) {
  const base = new URL(env.ACP_PUBLIC_URL);
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw new Error('ACP_PUBLIC_URL must be an HTTPS origin.');
  const allow = (env.ACP_ALLOWED_GITHUB_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!env.ACP_GITHUB_CLIENT_ID || !env.ACP_GITHUB_CLIENT_SECRET || !allow.length || allow.some(x => !/^[1-9]\d*$/.test(x))) {
    throw new Error('GitHub OAuth client ID, secret, and numeric user ID allowlist are required.');
  }
  return { origin: base.origin, clientId: env.ACP_GITHUB_CLIENT_ID, clientSecret: env.ACP_GITHUB_CLIENT_SECRET, allow: new Set(allow) };
}

export function createAcpServer(config, { request = fetch, promptAgent = runPrompt } = {}) {
  const oauth = new Map();
  const sessions = new Map();
  let busy = false;
  const files = new Map([
    ['/', ['index.html', 'text/html; charset=utf-8']],
    ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
    ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ]);
  const sweep = () => {
    const now = Date.now();
    for (const [k, v] of oauth) if (v.expires <= now) oauth.delete(k);
    for (const [k, v] of sessions) if (v.expires <= now) sessions.delete(k);
  };
  const headers = {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    'X-Frame-Options': 'DENY',
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
  return createServer(async (req, res) => {
    try {
      sweep();
      const url = new URL(req.url, config.origin);
      const cookies = parseCookies(req);
      const session = sessions.get(cookies['__Host-bpr-acp']);
      if (req.method === 'GET' && url.pathname === '/login') {
        if (oauth.size >= 1000) return send(res, 503, '{"error":"Too many login attempts."}');
        const state = token(), verifier = token();
        oauth.set(state, { verifier, expires: Date.now() + 600_000 });
        const authorize = new URL('https://github.com/login/oauth/authorize');
        authorize.search = new URLSearchParams({
          client_id: config.clientId, redirect_uri: `${config.origin}/callback`, state,
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
        if (!Number.isSafeInteger(user.id) || !config.allow.has(String(user.id))) return send(res, 403, '{"error":"GitHub user is not allowed."}');
        if (sessions.size >= 1000) return send(res, 503, '{"error":"Too many sessions."}');
        const id = token();
        sessions.set(id, { expires: Date.now() + 1_800_000 });
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
        if (req.headers.origin !== config.origin || req.headers['content-type'] !== 'application/json') return send(res, 403, '{"error":"Invalid request origin or content type."}');
        if (busy) return send(res, 429, '{"error":"The service is busy. Try again later."}');
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 16000) return send(res, 413, '{"error":"Request too large."}');
        }
        let input;
        try { input = JSON.parse(body); } catch { return send(res, 400, '{"error":"Invalid JSON."}'); }
        if (input?.synthetic !== true || typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 8000 || !isClinicalPlugin(input.plugin)) return send(res, 400, '{"error":"A synthetic prompt and known plugin are required."}');
        busy = true;
        const abort = new AbortController();
        res.on('close', () => { if (!res.writableEnded) abort.abort(); });
        try {
          const output = await promptAgent({ prompt: input.prompt, plugin: input.plugin, signal: abort.signal });
          return send(res, 200, JSON.stringify(output));
        } finally {
          busy = false;
        }
      }
      const file = files.get(url.pathname);
      if (req.method === 'GET' && file) return send(res, 200, await readFile(join(webDir, file[0])), file[1]);
      return send(res, 404, '{"error":"Not found."}');
    } catch (error) {
      console.error('ACP service request failed.');
      if (!res.headersSent) send(res, 500, '{"error":"Request failed. Check service logs."}');
      else res.end();
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const config = configFromEnv(process.env);
    const port = Number(process.env.ACP_PORT || 8787);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid ACP_PORT.');
    createAcpServer(config).listen(port, '127.0.0.1', () => console.log(`ACP service listening on 127.0.0.1:${port}; expose only through a configured HTTPS reverse proxy.`));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
