import {
  CUSTOMER_ACCOUNT_CLIENT_ID,
  CUSTOMER_ACCOUNT_LOGOUT_REDIRECT,
  CUSTOMER_ACCOUNT_PKCE_KEY,
  CUSTOMER_ACCOUNT_REDIRECT_URI,
  CUSTOMER_ACCOUNT_SCOPES,
  CUSTOMER_ACCOUNT_TOKENS_KEY,
} from '../config/customerAccount';
import { getDiscovery } from './customerAccountDiscovery';
import type { CustomerAccountTokens } from './customerAccountTypes';

interface PkceState {
  verifier: string;
  state: string;
  nonce: string;
  /** Path to return to in the SPA once the OAuth round-trip finishes. */
  returnTo: string;
}

interface TokenResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_in: number;
}

function base64UrlEncode(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes.buffer);
}

async function codeChallengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(digest);
}

function decodeIdTokenPayload(idToken: string): Record<string, unknown> {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Malformed id_token');
  const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(json);
}

export async function beginLogin(returnTo?: string): Promise<void> {
  const verifier = randomString(32);
  const state = randomString(16);
  const nonce = randomString(16);
  const pkce: PkceState = { verifier, state, nonce, returnTo: returnTo ?? window.location.pathname };
  sessionStorage.setItem(CUSTOMER_ACCOUNT_PKCE_KEY, JSON.stringify(pkce));

  const { authorization_endpoint } = await getDiscovery();
  const challenge = await codeChallengeFor(verifier);

  const url = new URL(authorization_endpoint);
  url.searchParams.set('client_id', CUSTOMER_ACCOUNT_CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', CUSTOMER_ACCOUNT_REDIRECT_URI);
  url.searchParams.set('scope', CUSTOMER_ACCOUNT_SCOPES);
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');

  window.location.assign(url.toString());
}

function readTokens(): CustomerAccountTokens | null {
  try {
    const raw = sessionStorage.getItem(CUSTOMER_ACCOUNT_TOKENS_KEY);
    return raw ? (JSON.parse(raw) as CustomerAccountTokens) : null;
  } catch {
    return null;
  }
}

function writeTokens(tokens: CustomerAccountTokens): void {
  sessionStorage.setItem(CUSTOMER_ACCOUNT_TOKENS_KEY, JSON.stringify(tokens));
}

function clearTokens(): void {
  sessionStorage.removeItem(CUSTOMER_ACCOUNT_TOKENS_KEY);
}

async function exchangeCodeForTokens(code: string, verifier: string): Promise<TokenResponse> {
  const { token_endpoint } = await getDiscovery();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CUSTOMER_ACCOUNT_CLIENT_ID,
    redirect_uri: CUSTOMER_ACCOUNT_REDIRECT_URI,
    code,
    code_verifier: verifier,
  });
  const res = await fetch(token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`token exchange HTTP ${res.status}`);
  return (await res.json()) as TokenResponse;
}

export async function handleAuthorizeCallback(
  searchParams: URLSearchParams,
): Promise<{ ok: boolean; error?: string; returnTo: string }> {
  const fallbackReturnTo = '/account';
  const oauthError = searchParams.get('error');
  if (oauthError) return { ok: false, error: oauthError, returnTo: fallbackReturnTo };

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  if (!code || !state) return { ok: false, error: 'missing_code_or_state', returnTo: fallbackReturnTo };

  const raw = sessionStorage.getItem(CUSTOMER_ACCOUNT_PKCE_KEY);
  if (!raw) return { ok: false, error: 'missing_pkce_state', returnTo: fallbackReturnTo };
  const pkce = JSON.parse(raw) as PkceState;
  sessionStorage.removeItem(CUSTOMER_ACCOUNT_PKCE_KEY);

  if (state !== pkce.state) return { ok: false, error: 'state_mismatch', returnTo: fallbackReturnTo };

  try {
    const tokenRes = await exchangeCodeForTokens(code, pkce.verifier);

    // Known simplification: we check the id_token's nonce/aud claims but do
    // not verify its RS256 signature against jwks_uri. The token arrives
    // over TLS directly from Shopify's own token_endpoint in response to a
    // code this same page generated, so the realistic threat model here is
    // narrower than "verify a token handed to us by an untrusted party."
    // Revisit if this identity is ever used for something higher-stakes
    // than displaying the signed-in customer's own profile/orders.
    const idPayload = decodeIdTokenPayload(tokenRes.id_token);
    if (idPayload.nonce !== pkce.nonce) return { ok: false, error: 'nonce_mismatch', returnTo: fallbackReturnTo };
    if (idPayload.aud !== CUSTOMER_ACCOUNT_CLIENT_ID) {
      return { ok: false, error: 'aud_mismatch', returnTo: fallbackReturnTo };
    }

    writeTokens({
      access_token: tokenRes.access_token,
      id_token: tokenRes.id_token,
      refresh_token: tokenRes.refresh_token,
      expires_at: Date.now() + tokenRes.expires_in * 1000,
    });

    return { ok: true, returnTo: pkce.returnTo || fallbackReturnTo };
  } catch (err) {
    console.error('customerAccountAuth: token exchange failed', err);
    return { ok: false, error: 'token_exchange_failed', returnTo: fallbackReturnTo };
  }
}

export async function refreshTokens(): Promise<boolean> {
  const current = readTokens();
  if (!current) return false;

  try {
    const { token_endpoint } = await getDiscovery();
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CUSTOMER_ACCOUNT_CLIENT_ID,
      refresh_token: current.refresh_token,
    });
    const res = await fetch(token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error(`refresh HTTP ${res.status}`);
    const tokenRes = (await res.json()) as TokenResponse;
    writeTokens({
      access_token: tokenRes.access_token,
      id_token: tokenRes.id_token,
      refresh_token: tokenRes.refresh_token,
      expires_at: Date.now() + tokenRes.expires_in * 1000,
    });
    return true;
  } catch (err) {
    console.warn('customerAccountAuth: refresh failed, clearing session', err);
    clearTokens();
    return false;
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = readTokens();
  if (!tokens) return null;
  if (tokens.expires_at - Date.now() < 60_000) {
    const refreshed = await refreshTokens();
    if (!refreshed) return null;
    return readTokens()?.access_token ?? null;
  }
  return tokens.access_token;
}

/** Sync, no network — safe to call on every render (e.g. the header badge). */
export function isSignedIn(): boolean {
  return readTokens() !== null;
}

export async function logout(): Promise<void> {
  const tokens = readTokens();
  clearTokens();
  if (!tokens) return;

  const { end_session_endpoint } = await getDiscovery();
  const url = new URL(end_session_endpoint);
  url.searchParams.set('id_token_hint', tokens.id_token);
  url.searchParams.set('post_logout_redirect_uri', CUSTOMER_ACCOUNT_LOGOUT_REDIRECT);
  window.location.assign(url.toString());
}
