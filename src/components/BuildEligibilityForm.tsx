import { useState, useMemo, useEffect, useRef } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { formatPrice, ORIGINAL_PRICE, BASE_PRICE, lookupPromo } from '../utils/pricingEngine';
import { useI18n } from '../i18n';
import { track } from '../analytics';
import { BUILD_APPLY_API, TURNSTILE_SITE_KEY } from '../config/build';
import '../styles/BuildEligibilityForm.css';

export const BUILD_CALENDAR_URL = 'https://calendar.app.google/rAqiE6pNumtECdnd7';

interface SubmitResult {
  applicationId: string;
  notionUrl: string;
  finalPrice: number;
  checkoutUrl?: string;
  message: string;
}

/**
 * Flat Build Ticket intake — single standard seat at SAR 9,630.
 * Tiers are cancelled: there is no eligibility step. We only collect the
 * contact + GitHub username needed to provision the candidate's account
 * (Shopify customer via Partner API), Notion onboarding page, and their own
 * GitHub repo after payment. Promo codes (LAUNCH10 / FOUNDER15) are applied
 * at checkout via Shopify's /discount/CODE flow.
 */
export default function BuildEligibilityForm() {
  const { ar } = useI18n();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', country: '', githubUsername: '' });
  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState('');
  const [promoError, setPromoError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);

  const promo = useMemo(() => lookupPromo(promoApplied || undefined), [promoApplied]);
  const finalPrice = promo ? BASE_PRICE * (1 - promo.discountPercent / 100) : BASE_PRICE;

  useEffect(() => {
    (window as any).onTurnstileSuccess = (token: string) => setTurnstileToken(token);
    return () => { delete (window as any).onTurnstileSuccess; };
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const applyPromoCode = () => {
    const code = promoInput.trim();
    if (!code) return;
    const found = lookupPromo(code);
    if (!found) {
      setPromoApplied('');
      setPromoError(ar ? 'رمز الخصم غير صالح' : 'Invalid promo code');
      return;
    }
    setPromoApplied(found.code);
    setPromoError('');
    track('build_promo_applied', { promo: found.code, discount: found.discountPercent });
  };

  const contactValid = form.fullName.trim() && form.email.trim().includes('@') && form.country.trim();

  const submitApplication = async () => {
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setSubmitError(ar ? 'يرجى إكمال التحقق الأمني' : 'Please complete the security check');
      return;
    }
    setSubmitting(true);
    setSubmitError('');

    const payload = {
      lang: ar ? 'ar' : 'en',
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      country: form.country.trim(),
      githubUsername: form.githubUsername.trim() || undefined,
      promoCode: promoApplied || undefined,
      turnstileToken: turnstileToken || undefined,
    };

    try {
      const res = await fetch(BUILD_APPLY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        throw new Error(result.error || (ar ? 'تعذر إرسال الطلب' : 'Could not submit application'));
      }

      track('build_application_submitted', {
        tier: 'standard',
        discount: promo?.discountPercent || 0,
        final_price: result.finalPrice,
      });

      try {
        localStorage.setItem('bs_build_ref', result.applicationId);
        const existing = (() => { try { return JSON.parse(localStorage.getItem('bs_profile') || 'null'); } catch { return null; } })();
        localStorage.setItem('bs_profile', JSON.stringify({
          id: existing?.id || 'local-' + Date.now(),
          name: existing?.name || form.fullName.trim(),
          email: existing?.email || form.email.trim(),
          phone: existing?.phone || form.phone.trim(),
          country: existing?.country || form.country.trim(),
          githubUsername: form.githubUsername.trim() || existing?.githubUsername,
          roles: existing?.roles || ['customer'],
          local: true,
          buildRef: result.applicationId,
        }));
      } catch { /* ignore */ }

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      setSubmitResult(result);
    } catch (err: any) {
      setSubmitError(err.message || (ar ? 'حدث خطأ' : 'Something went wrong'));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitResult) {
    return (
      <div className="build-form-container">
        <div className="form-step result-step">
          <div className="tier-icon" style={{ fontSize: '3rem' }}><Check size={48} color="#2a9d8f" /></div>
          <h2>{ar ? 'تم استلام طلبك!' : 'Application received!'}</h2>
          <p className="tier-subtitle">
            {ar ? `رقم الطلب: ${submitResult.applicationId}` : `Application ref: ${submitResult.applicationId}`}
          </p>
          <p className="step-description">{submitResult.message}</p>
          <div className="form-actions" style={{ marginTop: '1.5rem' }}>
            <a className="btn-primary" href={`/track?ref=${submitResult.applicationId}`}>
              {ar ? 'لوحة تقدمك →' : 'Track your progress →'}
            </a>
          </div>
          <div className="form-actions" style={{ marginTop: '0.75rem' }}>
            {submitResult.notionUrl && (
              <a className="btn-secondary" href={submitResult.notionUrl} target="_blank" rel="noopener noreferrer">
                {ar ? 'عرض في Notion' : 'View in Notion'}
              </a>
            )}
            <a className="btn-secondary" href="https://github.com" target="_blank" rel="noopener noreferrer">
              {ar ? 'فتح GitHub' : 'Open GitHub'}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="build-form-container">
      <div className="form-step welcome-step">
        <div className="build-ticket-card">
          <span className="launch-badge">{ar ? 'عرض الإطلاق — لفترة محدودة' : 'Launch offer — limited time'}</span>
          <div className="bt-price-row">
            <span className="bt-original">{formatPrice(ORIGINAL_PRICE, ar)}</span>
            <span className="bt-price">{formatPrice(finalPrice, ar)}</span>
            {promo && (
              <span className="bt-savings">
                {ar ? 'وفّرت' : 'You save'} {formatPrice(ORIGINAL_PRICE - finalPrice, ar)}
              </span>
            )}
          </div>
          {promo && <p className="promo-ok">✅ {ar ? promo.titleAr : promo.titleEn}</p>}

          {/* Promo code */}
          <div className="promo-box">
            <div className="promo-row">
              <input
                type="text"
                className="promo-input"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder={ar ? 'أدخل رمز الخصم' : 'Enter promo code'}
              />
              <button className="btn-promo" onClick={applyPromoCode}>{ar ? 'تطبيق' : 'Apply'}</button>
            </div>
            {promoError && <p className="promo-err">{promoError}</p>}
            {promoApplied && (
              <p className="promo-clear">
                <button className="promo-clear-btn" onClick={() => { setPromoApplied(''); setPromoError(''); }}>
                  {ar ? 'إزالة الرمز' : 'Remove code'}
                </button>
              </p>
            )}
          </div>

          <p className="bt-note">
            {ar
              ? 'تذكرة بناء واحدة بسعر موحد ٩٬٦٣٠ ريال — لا توجد فئات أو أسعار متدرجة.'
              : 'One standard Build Ticket at a flat 9,630 SAR — no tiers, no tier pricing.'}
          </p>

          {/* Contact + GitHub */}
          <div className="verification-form">
            <div className="form-field">
              <label>{ar ? 'الاسم الكامل' : 'Full name'} *</label>
              <input type="text" value={form.fullName} onChange={set('fullName')} placeholder={ar ? 'اسمك الثلاثي' : 'Your full name'} />
            </div>
            <div className="form-field">
              <label>{ar ? 'البريد الإلكتروني' : 'Email'} *</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="your@email.com" />
            </div>
            <div className="form-field">
              <label>{ar ? 'رقم الجوال' : 'Phone'}</label>
              <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+966 5X XXX XXXX" />
            </div>
            <div className="form-field">
              <label>{ar ? 'الدولة' : 'Country'} *</label>
              <input type="text" value={form.country} onChange={set('country')} placeholder={ar ? 'الدولة' : 'Your country'} />
            </div>
            <div className="form-field">
              <label>{ar ? 'اسم مستخدم GitHub' : 'GitHub username'}</label>
              <input
                type="text"
                value={form.githubUsername}
                onChange={set('githubUsername')}
                placeholder={ar ? 'مثال: fadil369' : 'e.g. fadil369'}
              />
              <p className="field-hint">
                {ar
                  ? 'مطلوب للانضمام عبر GitHub: بعد الدفع نولّد مستودعك الخاص من قالب BUILD ونضيفك كمساهم.'
                  : 'Required for the GitHub flow: after payment we generate your own repo from the BUILD starter and add you as a collaborator.'}
              </p>
            </div>
          </div>

          {TURNSTILE_SITE_KEY && (
            <div className="turnstile-box" style={{ margin: '1rem 0', minHeight: '65px' }}>
              <div ref={turnstileRef} className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-callback="onTurnstileSuccess" />
            </div>
          )}

          {submitError && <p className="promo-err" style={{ marginBottom: '1rem' }}>{submitError}</p>}

          <button className="btn-primary" onClick={submitApplication} disabled={!contactValid || submitting}>
            {submitting ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> {ar ? 'جاري الإرسال...' : 'Submitting...'}
              </>
            ) : (
              ar ? 'أرسل واحجز مقعدك →' : 'Secure your seat →'
            )}
          </button>

          {/* Small booking link below the ticket */}
          <p className="bt-booking">
            <a
              href={BUILD_CALENDAR_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('build_booking_link', { location: 'ticket' })}
            >
              {ar ? 'قبل أن تبدأ؟ احجز جلسة مع المؤسس ↗' : 'Not sure yet? Book a session with the founder ↗'}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
