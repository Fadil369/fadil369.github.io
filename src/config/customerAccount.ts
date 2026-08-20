/// <reference types="vite/client" />

/**
 * Config for Shopify's native Customer Account API (OAuth 2.0 / PKCE),
 * wired in alongside — not instead of — the existing OTP/claim account
 * system (see CUSTOMER_CLAIM_URL etc. in ./build.ts).
 */

export const CUSTOMER_ACCOUNT_DOMAIN =
  import.meta.env.VITE_CUSTOMER_ACCOUNT_DOMAIN || 'https://account.brainsait.org';

export const CUSTOMER_ACCOUNT_CLIENT_ID = import.meta.env.VITE_CUSTOMER_ACCOUNT_CLIENT_ID || '';

// Must resolve to exactly the Callback URI registered in Shopify Admin →
// Settings → Customer accounts → Customer Account API (Public client) for
// CUSTOMER_ACCOUNT_CLIENT_ID. Do not turn this into a relative path — it is
// sent to Shopify's authorize/token endpoints as an absolute redirect_uri.
export const CUSTOMER_ACCOUNT_REDIRECT_URI = `${window.location.origin}/account/authorize`;

// Where Shopify's end_session_endpoint sends the browser back to after logout.
export const CUSTOMER_ACCOUNT_LOGOUT_REDIRECT = `${window.location.origin}/account`;

export const CUSTOMER_ACCOUNT_SCOPES = 'openid email customer-account-api:full';

// sessionStorage keys (deliberately not localStorage — see customerAccountAuth.ts).
export const CUSTOMER_ACCOUNT_TOKENS_KEY = 'bs_shopify_customer_tokens';
export const CUSTOMER_ACCOUNT_PKCE_KEY = 'bs_shopify_pkce';
export const CUSTOMER_ACCOUNT_DISCOVERY_KEY = 'bs_shopify_oidc_config';
