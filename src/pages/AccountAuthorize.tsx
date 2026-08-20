import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { handleAuthorizeCallback } from '../lib/customerAccountAuth';

/**
 * OAuth callback route for Shopify's Customer Account API
 * (registered as the Callback URI in Shopify Admin). GitHub Pages serves
 * this path through the same SPA shell as everything else (see
 * scripts/publish.mjs's index.html -> 404.html copy), so no extra hosting
 * config is needed for react-router to pick up ?code=&state=... here.
 */
export default function AccountAuthorize() {
  const { ar } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    handleAuthorizeCallback(searchParams).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        navigate(result.returnTo, { replace: true });
      } else {
        setError(result.error ?? 'unknown_error');
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="page" style={{ minHeight: '50vh', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      {error ? (
        <div>
          <p className="promo-err">
            {ar ? 'تعذّر إكمال تسجيل الدخول عبر Shopify.' : 'Could not finish signing in with Shopify.'}
          </p>
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            <Link to="/account">{ar ? '← العودة للحساب' : '← Back to account'}</Link>
          </p>
        </div>
      ) : (
        <p className="muted">{ar ? 'جارِ إكمال تسجيل الدخول…' : 'Finishing sign-in…'}</p>
      )}
    </main>
  );
}
