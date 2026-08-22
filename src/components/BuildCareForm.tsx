import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useI18n } from '../i18n';
import { track } from '../analytics';
import { BUILD_APPLY_API, BUILD_CARE_SHOPIFY_URL } from '../config/build';
import '../styles/BuildEligibilityForm.css';
import '../styles/BuildCareForm.css';

interface SubmitResult {
  applicationId: string;
  notionUrl: string;
  checkoutUrl?: string;
  message: string;
}

const PROFESSIONS: { value: string; en: string; ar: string }[] = [
  { value: 'doctor', en: 'Doctor / physician', ar: 'طبيب' },
  { value: 'nurse', en: 'Nurse', ar: 'ممرض/ة' },
  { value: 'healthcare', en: 'Other healthcare worker', ar: 'عامل صحي آخر' },
];

/**
 * BUILD-CARE — a free BUILD seat for self-declared healthcare workers.
 * No promo codes, no installment plan: one free ticket, routed through
 * Shopify checkout at SAR 0 (product handle `build-care`) so it still
 * produces a real, trackable order. Deliberately excludes deployment
 * support, the marketing/delivery phase, and 1:1 mentorship — those stay
 * exclusive to the paid Standard Build Ticket.
 */
export default function BuildCareForm() {
  const { ar } = useI18n();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', country: '', githubUsername: '' });
  const [profession, setProfession] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const contactValid = form.fullName.trim() && form.email.trim().includes('@') && form.country.trim() && profession;

  const submitApplication = async () => {
    setSubmitting(true);
    setSubmitError('');

    const payload = {
      lang: ar ? 'ar' : 'en',
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      country: form.country.trim(),
      githubUsername: form.githubUsername.trim() || undefined,
      profession,
      ticketType: 'care',
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

      track('build_care_application_submitted', { applicationId: result.applicationId });

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
      <div className="build-form-container build-care-form-container">
        <div className="form-step result-step">
          <div className="tier-icon" style={{ fontSize: '3rem' }}><Check size={48} color="#2a9d8f" /></div>
          <h2>{ar ? 'تم استلام طلبك!' : 'Application received!'}</h2>
          <p className="tier-subtitle">
            {ar ? `رقم الطلب: ${submitResult.applicationId}` : `Application ref: ${submitResult.applicationId}`}
          </p>
          <p className="step-description">{submitResult.message}</p>
          {submitResult.notionUrl && (
            <div className="form-actions" style={{ marginTop: '1rem' }}>
              <a className="btn-secondary" href={submitResult.notionUrl} target="_blank" rel="noopener noreferrer">
                {ar ? 'عرض في Notion' : 'View in Notion'}
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="build-form-container build-care-form-container">
      <div className="form-step welcome-step">
        <div className="build-ticket-card build-care-card">
          <span className="launch-badge care-badge">🩺 {ar ? 'لبناة الرعاية الصحية' : 'For healthcare workers'}</span>
          <div className="bt-price-row">
            <span className="bt-price care-price">{ar ? 'مجاناً' : 'Free'}</span>
          </div>

          <p className="bt-note care-note">
            {ar
              ? 'تذكرة BUILD-CARE مجانية بالكامل لأي عامل صحي يبني تطبيقاً صحياً — بدون فئات إضافية.'
              : 'BUILD-CARE is a completely free ticket for any healthcare worker building a healthcare app.'}
          </p>

          <ul className="care-exclusions">
            <li>❌ {ar ? 'بدون دعم النشر (Deployment)' : 'No deployment support'}</li>
            <li>❌ {ar ? 'بدون مرحلة التسويق والتسليم' : 'No marketing & delivery phase'}</li>
            <li>❌ {ar ? 'بدون جلسات فردية (1:1)' : 'No 1:1 mentorship'}</li>
          </ul>
          <p className="care-includes-note">
            {ar
              ? '✅ يشمل: منهج بناء موجّه، حسابك في account.brainsait.org، عقلك الثاني، مكتبة LEARN، ومستودع GitHub خاص بك.'
              : '✅ Includes: a guided build curriculum, your account.brainsait.org access, Second Brain, the LEARN catalog, and your own GitHub repo.'}
          </p>

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
              <label>{ar ? 'مهنتك في الرعاية الصحية' : 'Your healthcare profession'} *</label>
              <select value={profession} onChange={(e) => setProfession(e.target.value)}>
                <option value="">{ar ? 'اختر...' : 'Select...'}</option>
                {PROFESSIONS.map((p) => (
                  <option key={p.value} value={p.value}>{ar ? p.ar : p.en}</option>
                ))}
              </select>
              <p className="field-hint">
                {ar ? 'تصريح ذاتي — بدون تحقق من الترخيص.' : 'Self-declared — no license verification required.'}
              </p>
            </div>
            <div className="form-field">
              <label>{ar ? 'اسم مستخدم GitHub' : 'GitHub username'}</label>
              <input
                type="text"
                value={form.githubUsername}
                onChange={set('githubUsername')}
                placeholder={ar ? 'مثال: fadil369' : 'e.g. fadil369'}
              />
            </div>
          </div>

          {submitError && <p className="promo-err" style={{ marginBottom: '1rem' }}>{submitError}</p>}

          <button className="btn-primary care-submit" onClick={submitApplication} disabled={!contactValid || submitting}>
            {submitting ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> {ar ? 'جاري الإرسال...' : 'Submitting...'}
              </>
            ) : (
              ar ? 'احصل على مقعدك المجاني →' : 'Get your free seat →'
            )}
          </button>

          <p className="bt-booking">
            <a href={BUILD_CARE_SHOPIFY_URL} target="_blank" rel="noopener noreferrer">
              {ar ? 'عرض في المتجر ↗' : 'View in store ↗'}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
