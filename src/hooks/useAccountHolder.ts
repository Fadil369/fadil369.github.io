import { useEffect, useState } from 'react';

interface Identity {
  profile_id: string;
  name?: string;
  roles?: string[];
}

declare global {
  interface Window {
    BrainSAIT?: {
      session: {
        resolve: () => Promise<Identity | null>;
      };
    };
  }
}

/**
 * Detect a signed-in BrainSAIT account holder using the ecosystem SSO bridge
 * (https://brainsait.de/assets/ecosystem-session.js). Returns `null` while
 * resolving and a boolean once the identity is known.
 *
 * Guests (no session) get paid checkout. Account holders get free access to
 * the Learn stage.
 */
export function useAccountHolder(): boolean | null {
  const [holder, setHolder] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      try {
        const bs = window.BrainSAIT;
        if (!bs?.session?.resolve) {
          setHolder(false);
          return;
        }
        const id = await bs.session.resolve();
        if (!cancelled) setHolder(Boolean(id));
      } catch {
        if (!cancelled) setHolder(false);
      }
    };
    // The bridge may load after this effect runs (deferred script).
    if (window.BrainSAIT?.session) {
      resolve();
    } else {
      const t = window.setInterval(() => {
        if (window.BrainSAIT?.session) {
          window.clearInterval(t);
          resolve();
        }
      }, 250);
      // Give up after 3s if the bridge never arrives.
      const bail = window.setTimeout(() => {
        window.clearInterval(t);
        if (!cancelled) setHolder(false);
      }, 3000);
      return () => { cancelled = true; window.clearInterval(t); window.clearTimeout(bail); };
    }
    return () => { cancelled = true; };
  }, []);

  return holder;
}
