import { CUSTOMER_ACCOUNT_DISCOVERY_KEY, CUSTOMER_ACCOUNT_DOMAIN } from '../config/customerAccount';

interface OidcConfig {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint: string;
  jwks_uri: string;
}

interface CachedDiscovery {
  fetchedAt: number;
  oidc: OidcConfig;
}

const DISCOVERY_TTL_MS = 24 * 60 * 60 * 1000;

// Verified live against account.brainsait.org on 2026-08-20 — used only if
// the discovery fetch itself fails (network blip), so the login button
// doesn't silently break.
const FALLBACK_OIDC: OidcConfig = {
  authorization_endpoint: `${CUSTOMER_ACCOUNT_DOMAIN}/authentication/oauth/authorize`,
  token_endpoint: `${CUSTOMER_ACCOUNT_DOMAIN}/authentication/oauth/token`,
  end_session_endpoint: `${CUSTOMER_ACCOUNT_DOMAIN}/authentication/logout`,
  jwks_uri: `${CUSTOMER_ACCOUNT_DOMAIN}/.well-known/jwks.json`,
};

export async function getDiscovery(): Promise<OidcConfig> {
  try {
    const cached = sessionStorage.getItem(CUSTOMER_ACCOUNT_DISCOVERY_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as CachedDiscovery;
      if (Date.now() - parsed.fetchedAt < DISCOVERY_TTL_MS) return parsed.oidc;
    }
  } catch { /* ignore, refetch */ }

  try {
    const res = await fetch(`${CUSTOMER_ACCOUNT_DOMAIN}/.well-known/openid-configuration`);
    if (!res.ok) throw new Error(`discovery HTTP ${res.status}`);
    const oidc = (await res.json()) as OidcConfig;
    try {
      sessionStorage.setItem(
        CUSTOMER_ACCOUNT_DISCOVERY_KEY,
        JSON.stringify({ fetchedAt: Date.now(), oidc } satisfies CachedDiscovery),
      );
    } catch { /* ignore storage failure */ }
    return oidc;
  } catch (err) {
    console.warn('customerAccountDiscovery: falling back to hardcoded OIDC config', err);
    return FALLBACK_OIDC;
  }
}

// Not cached with a hardcoded fallback like the OIDC config above — this
// path is versioned (e.g. /customer/api/2026-07/graphql) and Shopify bumps
// it over time, so a stale hardcoded value would fail silently after a
// deprecation instead of surfacing the discovery error.
export async function getCustomerApiEndpoint(): Promise<string> {
  const res = await fetch(`${CUSTOMER_ACCOUNT_DOMAIN}/.well-known/customer-account-api`);
  if (!res.ok) throw new Error(`customer-account-api discovery HTTP ${res.status}`);
  const { graphql_api } = (await res.json()) as { graphql_api: string };
  return graphql_api;
}
