import { useCallback, useEffect, useState } from 'react';
import { BUILD_APPLY_BASE } from '../config/build';
import { beginLogin, isSignedIn, logout as shopifyLogout } from '../lib/customerAccountAuth';
import { fetchCustomerProfile } from '../lib/customerAccountApi';
import type { CustomerAccountProfile } from '../lib/customerAccountTypes';

// Matches Account.tsx's own CUSTOMER_TOKEN_KEY constant — duplicated as a
// literal here rather than imported, so this hook doesn't couple to
// Account.tsx internals (that constant isn't exported).
const OTP_SESSION_TOKEN_KEY = 'bs_customer_token';

export type CustomerAccountStatus = 'signed-out' | 'loading' | 'signed-in' | 'error';

interface UseCustomerAccountResult {
  status: CustomerAccountStatus;
  profile: CustomerAccountProfile | null;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

/** Best-effort: if this browser also has a live OTP/claim session, tell
 *  build-apply about the Shopify customer so it can be linked to the
 *  existing `students` row by email. Never blocks the UI on failure. */
function linkShopifyIdentityIfPossible(shopifyCustomerGid: string): void {
  let otpToken: string | null = null;
  try {
    otpToken = localStorage.getItem(OTP_SESSION_TOKEN_KEY);
  } catch {
    return;
  }
  if (!otpToken) return;

  fetch(`${BUILD_APPLY_BASE}/customer/link-shopify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Token': otpToken },
    body: JSON.stringify({ shopifyCustomerGid }),
  }).catch(() => { /* best-effort, ignore */ });
}

export function useCustomerAccount(): UseCustomerAccountResult {
  const [status, setStatus] = useState<CustomerAccountStatus>('loading');
  const [profile, setProfile] = useState<CustomerAccountProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSignedIn()) {
      setStatus('signed-out');
      setProfile(null);
      return;
    }
    setStatus('loading');
    try {
      const p = await fetchCustomerProfile();
      setProfile(p);
      setStatus('signed-in');
      setError(null);
      linkShopifyIdentityIfPossible(p.id);
    } catch (err) {
      console.error('useCustomerAccount: failed to load profile', err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus(isSignedIn() ? 'error' : 'signed-out');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const login = useCallback(async () => {
    await beginLogin();
  }, []);

  const logout = useCallback(async () => {
    await shopifyLogout();
    setStatus('signed-out');
    setProfile(null);
  }, []);

  return { status, profile, error, login, logout };
}
