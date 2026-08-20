import { useI18n, money } from '../i18n';
import { useCustomerAccount } from '../hooks/useCustomerAccount';

/**
 * Signed-in-with-Shopify panel, additive to Account.tsx's existing
 * OTP/claim/portal-SSO/Forge identity system — not merged with it. Renders
 * on both the signed-out and signed-in branches of the Account page as its
 * own clearly-labeled card.
 */
export default function ShopifyAccountPanel() {
  const { ar } = useI18n();
  const { status, profile, error, login, logout } = useCustomerAccount();

  return (
    <div className="account-card" style={{ marginTop: '1.5rem' }}>
      <h3>{ar ? 'حساب Shopify' : 'Shopify account'}</h3>

      {status === 'loading' && (
        <p className="muted">{ar ? 'جارِ التحميل…' : 'Loading…'}</p>
      )}

      {status === 'signed-out' && (
        <>
          <p className="muted" style={{ marginBottom: '1rem' }}>
            {ar
              ? 'سجّل الدخول بحساب Shopify الخاص بك (عبر البريد الإلكتروني أو حساب Google) لعرض طلباتك مباشرة من store.brainsait.org.'
              : 'Sign in with your Shopify account — by email or with Google — to see your orders directly from store.brainsait.org.'}
          </p>
          <button className="button primary" style={{ width: '100%' }} onClick={login}>
            {ar ? 'الدخول عبر Shopify' : 'Sign in with Shopify'}
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <p className="promo-err" style={{ marginBottom: '0.75rem' }}>
            {ar ? 'تعذّر تحميل بيانات حساب Shopify.' : 'Could not load Shopify account data.'}
            {error ? ` (${error})` : ''}
          </p>
          <button className="button secondary" style={{ width: '100%' }} onClick={logout}>
            {ar ? 'الخروج من حساب Shopify' : 'Sign out of Shopify account'}
          </button>
        </>
      )}

      {status === 'signed-in' && profile && (
        <>
          <div className="account-row" style={{ borderTop: 'none', paddingTop: 0 }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {[profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email}
              </p>
              {profile.email && <p className="muted" style={{ margin: '0.2rem 0 0' }}>{profile.email}</p>}
              {profile.defaultAddress?.city && (
                <p className="muted" style={{ margin: '0.2rem 0 0' }}>
                  {[profile.defaultAddress.address1, profile.defaultAddress.city, profile.defaultAddress.country]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
            </div>
          </div>

          <div className="account-row">
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 0.6rem', fontWeight: 600 }}>
                {ar ? 'أحدث الطلبات' : 'Recent orders'}
              </p>
              {profile.orders.length === 0 ? (
                <p className="muted">{ar ? 'لا توجد طلبات بعد.' : 'No orders yet.'}</p>
              ) : (
                profile.orders.map((order) => (
                  <div
                    key={order.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      padding: '0.4rem 0',
                    }}
                  >
                    <span>{order.name}</span>
                    <span className="muted">
                      {new Date(order.processedAt).toLocaleDateString(ar ? 'ar' : 'en-US')}
                    </span>
                    <span>{money(Number(order.totalPrice.amount), ar)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <button className="button secondary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={logout}>
            {ar ? 'الخروج من حساب Shopify' : 'Sign out of Shopify account'}
          </button>
        </>
      )}
    </div>
  );
}
