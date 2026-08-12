import { useState, useMemo, useEffect, useRef } from 'react';
import { Check, Loader2 } from 'lucide-react';
import {
  calculatePrice,
  formatPrice,
  type EligibilityData,
  type PricingResult,
  BASE_PRICE,
} from '../utils/pricingEngine';
import { useI18n } from '../i18n';
import { track } from '../analytics';
import { BUILD_APPLY_API, TURNSTILE_SITE_KEY } from '../config/build';
import '../styles/BuildEligibilityForm.css';

type FormStep = 'welcome' | 'contact' | 'identity' | 'profession' | 'verification' | 'result' | 'confirmation';

interface ContactData {
  fullName: string;
  email: string;
  phone: string;
  country: string;
}

interface EvidenceFile {
  name: string;
  type: string;
  base64: string;
}

function ResultTracker({ tier, discount, price }: { tier: string; discount: number; price: number }) {
  useEffect(() => {
    track('build_eligibility', { tier, discount, final_price: price });
  }, [tier, discount, price]);
  return null;
}

function readFileAsBase64(file: File): Promise<EvidenceFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type || 'application/octet-stream',
        base64: reader.result as string,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <h2>{title}</h2>
      {subtitle && <p className="step-subtitle">{subtitle}</p>}
    </>
  );
}

export default function BuildEligibilityForm() {
  const { ar, t } = useI18n();
  const [step, setStep] = useState<FormStep>('welcome');
  const [data, setData] = useState<EligibilityData>({});
  const [contact, setContact] = useState<ContactData>({ fullName: '', email: '', phone: '', country: '' });
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<EvidenceFile | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [submitResult, setSubmitResult] = useState<{
    applicationId: string;
    notionUrl: string;
    finalPrice: number;
    checkoutUrl?: string;
    message: string;
  } | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);

  const pricing = useMemo(() => calculatePrice(data), [data]);

  useEffect(() => {
    (window as any).onTurnstileSuccess = (token: string) => setTurnstileToken(token);
    return () => {
      delete (window as any).onTurnstileSuccess;
    };
  }, []);

  const updateData = (updates: Partial<EligibilityData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const handleIdentitySelect = (identity: string) => {
    updateData({ identity });
    setStep('profession');
  };

  const handleProfessionSelect = (profession: string) => {
    updateData({ profession });
    if (profession === 'other' || profession === 'entrepreneur') {
      setStep('verification');
    } else {
      setStep('result');
    }
  };

  const handleCategorySelect = (category: string) => {
    updateData({ category });
    setStep('verification');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVerificationFile(file);
    try {
      const encoded = await readFileAsBase64(file);
      setEvidenceFile(encoded);
    } catch {
      setSubmitError(ar ? 'تعذر قراءة الملف' : 'Could not read file');
    }
  };

  const contactValid = contact.fullName.trim() && contact.email.trim().includes('@') && contact.country.trim();

  const submitApplication = async () => {
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setSubmitError(ar ? 'يرجى إكمال التحقق الأمني' : 'Please complete the security check');
      return;
    }
    setSubmitting(true);
    setSubmitError('');

    const payload = {
      lang: ar ? 'ar' : 'en',
      fullName: contact.fullName.trim(),
      email: contact.email.trim(),
      phone: contact.phone.trim(),
      country: contact.country.trim(),
      identity: data.identity,
      profession: data.profession,
      category: data.category,
      organizationName: data.organizationName,
      universityName: data.universityName,
      website: data.website,
      linkedinUrl: data.linkedinUrl,
      buildingDescription: data.buildingDescription,
      turnstileToken: turnstileToken || undefined,
      evidenceFile: evidenceFile || undefined,
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
        tier: result.tier,
        discount: result.discount,
        final_price: result.finalPrice,
      });

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      setSubmitResult(result);
      setStep('confirmation');
    } catch (err: any) {
      setSubmitError(err.message || (ar ? 'حدث خطأ' : 'Something went wrong'));
    } finally {
      setSubmitting(false);
    }
  };

  const requiresVerification = data.identity === 'SA' || data.identity === 'SD';

  return (
    <div className="build-form-container">
      {/* Welcome Screen */}
      {step === 'welcome' && (
        <div className="form-step welcome-step">
          <StepHeader
            title={ar ? 'ابنِ شيئاً مهماً' : 'Build something that matters'}
            subtitle={ar ? `تذكرة البناء — ${formatPrice(BASE_PRICE, true)}` : `Build Ticket — ${formatPrice(BASE_PRICE)}`}
          />
          <p className="step-description">
            {ar
              ? 'تحقق من استحقاقك — قد تحصل على خصم مجاني أو مخفض بناءً على هويتك أو مهنتك.'
              : 'Check your eligibility — you may qualify for a free or discounted seat based on your identity or profession.'}
          </p>
          <button className="btn-primary" onClick={() => setStep('contact')}>
            {ar ? 'تحقق من استحقاقي →' : 'Check my eligibility →'}
          </button>
        </div>
      )}

      {/* Contact Screen */}
      {step === 'contact' && (
        <div className="form-step verification-step">
          <StepHeader
            title={ar ? 'بيانات التواصل' : 'Contact details'}
            subtitle={ar ? 'أدخل بياناتك لإرسال طلبك' : 'Enter your details so we can process your application'}
          />
          <div className="verification-form">
            <div className="form-field">
              <label>{ar ? 'الاسم الكامل' : 'Full name'} *</label>
              <input
                type="text"
                value={contact.fullName}
                onChange={(e) => setContact((c) => ({ ...c, fullName: e.target.value }))}
                placeholder={ar ? 'اسمك الثلاثي' : 'Your full name'}
              />
            </div>
            <div className="form-field">
              <label>{ar ? 'البريد الإلكتروني' : 'Email'} *</label>
              <input
                type="email"
                value={contact.email}
                onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                placeholder={ar ? 'your@email.com' : 'your@email.com'}
              />
            </div>
            <div className="form-field">
              <label>{ar ? 'رقم الجوال' : 'Phone'}</label>
              <input
                type="tel"
                value={contact.phone}
                onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                placeholder={ar ? '+966 5X XXX XXXX' : '+966 5X XXX XXXX'}
              />
            </div>
            <div className="form-field">
              <label>{ar ? 'الدولة' : 'Country'} *</label>
              <input
                type="text"
                value={contact.country}
                onChange={(e) => setContact((c) => ({ ...c, country: e.target.value }))}
                placeholder={ar ? 'الدولة' : 'Your country'}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setStep('welcome')}>
              ← {ar ? 'رجوع' : 'Back'}
            </button>
            <button className="btn-primary" onClick={() => setStep('identity')} disabled={!contactValid}>
              {ar ? 'متابعة →' : 'Continue →'}
            </button>
          </div>
        </div>
      )}

      {/* Identity Selection */}
      {step === 'identity' && (
        <div className="form-step identity-step">
          <StepHeader title={ar ? 'من أنت؟' : 'Who are you?'} subtitle={ar ? 'اختر هويتك' : 'Select your identity'} />
          <div className="options-grid">
            <button className={'option-card' + (data.identity === 'SA' ? ' selected' : '')} onClick={() => handleIdentitySelect('SA')}>
              <div className="option-icon">🇸🇦</div>
              <div className="option-label">{ar ? 'سعودي' : 'Saudi'}</div>
            </button>
            <button className={'option-card' + (data.identity === 'SD' ? ' selected' : '')} onClick={() => handleIdentitySelect('SD')}>
              <div className="option-icon">🇸🇩</div>
              <div className="option-label">{ar ? 'سوداني' : 'Sudanese'}</div>
            </button>
            <button className={'option-card' + (data.identity === 'OTHER' ? ' selected' : '')} onClick={() => handleIdentitySelect('OTHER')}>
              <div className="option-icon">🌍</div>
              <div className="option-label">{ar ? 'دولي' : 'International'}</div>
            </button>
          </div>
          <button className="btn-secondary" onClick={() => setStep('contact')}>
            ← {ar ? 'رجوع' : 'Back'}
          </button>
        </div>
      )}

      {/* Professional Status */}
      {step === 'profession' && (
        <div className="form-step profession-step">
          <StepHeader title={ar ? 'ماذا تفعل؟' : 'What do you do?'} subtitle={ar ? 'اختر فئتك المهنية' : 'Select your professional category'} />
          <div className="options-grid">
            <button className={'option-card' + (data.profession === 'doctor' ? ' selected' : '')} onClick={() => handleProfessionSelect('doctor')}>
              <div className="option-icon">👨‍⚕️</div>
              <div className="option-label">{ar ? 'طبيب' : 'Doctor'}</div>
            </button>
            <button className={'option-card' + (data.profession === 'nurse' ? ' selected' : '')} onClick={() => handleProfessionSelect('nurse')}>
              <div className="option-icon">👩‍⚕️</div>
              <div className="option-label">{ar ? 'ممرضة' : 'Nurse'}</div>
            </button>
            <button className={'option-card' + (data.profession === 'healthcare' ? ' selected' : '')} onClick={() => handleProfessionSelect('healthcare')}>
              <div className="option-icon">🏥</div>
              <div className="option-label">{ar ? 'متخصص صحي آخر' : 'Other Healthcare'}</div>
            </button>
            <button className={'option-card' + (data.category === 'entrepreneur' ? ' selected' : '')} onClick={() => handleCategorySelect('entrepreneur')}>
              <div className="option-icon">⚔️</div>
              <div className="option-label">{ar ? 'رائد أعمال' : 'Warrior Entrepreneur'}</div>
            </button>
            <button className={'option-card' + (data.category === 'student' ? ' selected' : '')} onClick={() => handleCategorySelect('student')}>
              <div className="option-icon">🎓</div>
              <div className="option-label">{ar ? 'طالب' : 'Student'}</div>
            </button>
            <button className={'option-card' + (data.category === 'researcher' ? ' selected' : '')} onClick={() => handleCategorySelect('researcher')}>
              <div className="option-icon">🔬</div>
              <div className="option-label">{ar ? 'باحث' : 'Researcher'}</div>
            </button>
            <button className={'option-card' + (data.profession === 'other' ? ' selected' : '')} onClick={() => handleProfessionSelect('other')}>
              <div className="option-icon">🚀</div>
              <div className="option-label">{ar ? 'آخر' : 'Other'}</div>
            </button>
          </div>
          <button className="btn-secondary" onClick={() => setStep('identity')}>
            ← {ar ? 'رجوع' : 'Back'}
          </button>
        </div>
      )}

      {/* Verification Screen */}
      {step === 'verification' && (
        <div className="form-step verification-step">
          <h2>
            {requiresVerification
              ? ar ? 'تحقق من هويتك' : 'Verify your identity'
              : ar ? 'أخبرنا عن مشروعك' : 'Tell us about your project'}
          </h2>

          {requiresVerification ? (
            <div className="verification-form">
              <div className="form-field">
                <label>
                  {data.identity === 'SA'
                    ? ar ? 'هوية وطنية سعودية' : 'Saudi National ID'
                    : ar ? 'جواز السفر أو الهوية الوطنية' : 'Passport or National ID'}
                </label>
                <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="file-input" />
                {verificationFile && <p className="file-name">{verificationFile.name}</p>}
              </div>
            </div>
          ) : (
            <div className="verification-form">
              {data.category === 'entrepreneur' && (
                <>
                  <div className="form-field">
                    <label>{ar ? 'اسم الشركة أو المشروع' : 'Company or Project Name'}</label>
                    <input
                      type="text"
                      placeholder={ar ? 'اسم المشروع' : 'Your project name'}
                      value={data.organizationName || ''}
                      onChange={(e) => updateData({ organizationName: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label>{ar ? 'موقع ويب أو LinkedIn' : 'Website or LinkedIn'}</label>
                    <input
                      type="url"
                      placeholder={ar ? 'رابط المشروع' : 'Your project URL'}
                      value={data.website || ''}
                      onChange={(e) => updateData({ website: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label>{ar ? 'ماذا تبني؟' : 'What are you building?'}</label>
                    <textarea
                      placeholder={ar ? 'وصف مختصر...' : 'Brief description...'}
                      value={data.buildingDescription || ''}
                      onChange={(e) => updateData({ buildingDescription: e.target.value })}
                      rows={4}
                    />
                  </div>
                </>
              )}

              {data.category === 'student' && (
                <div className="form-field">
                  <label>{ar ? 'اسم الجامعة' : 'University Name'}</label>
                  <input
                    type="text"
                    placeholder={ar ? 'جامعتك' : 'Your university'}
                    value={data.universityName || ''}
                    onChange={(e) => updateData({ universityName: e.target.value })}
                  />
                </div>
              )}

              {data.category === 'researcher' && (
                <div className="form-field">
                  <label>{ar ? 'مجال البحث' : 'Research Area'}</label>
                  <input
                    type="text"
                    placeholder={ar ? 'مجال بحثك' : 'Your research area'}
                    value={data.buildingDescription || ''}
                    onChange={(e) => updateData({ buildingDescription: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setStep('profession')}>
              ← {ar ? 'رجوع' : 'Back'}
            </button>
            <button
              className="btn-primary"
              onClick={() => setStep('result')}
              disabled={requiresVerification && !verificationFile}
            >
              {ar ? 'متابعة →' : 'Continue →'}
            </button>
          </div>
        </div>
      )}

      {/* Result Screen */}
      {step === 'result' && (
        <div className="form-step result-step">
          <ResultTracker tier={pricing.eligibilityId} discount={pricing.discount} price={pricing.finalPrice} />
          <div className="tier-icon">{pricing.tier.icon}</div>
          <h2>{ar ? pricing.tier.titleAr : pricing.tier.titleEn}</h2>
          <p className="tier-subtitle">
            {ar
              ? `تذكرة البناء الخاصة بك — ${pricing.finalPrice === 0 ? 'مجانية' : formatPrice(pricing.finalPrice, true)}`
              : `Your Build Ticket — ${pricing.finalPrice === 0 ? 'FREE' : formatPrice(pricing.finalPrice)}`}
          </p>

          <div className="price-display">
            <div className="price-row original">
              <span>{ar ? 'السعر الأصلي' : 'Original Price'}</span>
              <span className="price crossed">{formatPrice(pricing.originalPrice, ar)}</span>
            </div>
            {pricing.discount > 0 && (
              <div className="price-row discount">
                <span>{ar ? `الخصم ${pricing.discount}%` : `Discount ${pricing.discount}%`}</span>
                <span className="price-savings">−{formatPrice(pricing.savings, ar)}</span>
              </div>
            )}
            <div className="price-row final">
              <span className="label-final">{ar ? 'تذكرة البناء الخاصة بك' : 'Your Build Ticket'}</span>
              <span className="price-final">
                {pricing.finalPrice === 0 ? (ar ? 'مجاني' : 'FREE') : formatPrice(pricing.finalPrice, ar)}
              </span>
            </div>
          </div>

          {TURNSTILE_SITE_KEY && (
            <div className="turnstile-box" style={{ marginBottom: '1.5rem', minHeight: '65px' }}>
              <div
                ref={turnstileRef}
                className="cf-turnstile"
                data-sitekey={TURNSTILE_SITE_KEY}
                data-callback="onTurnstileSuccess"
              />
            </div>
          )}

          {submitError && <p className="promo-err" style={{ marginBottom: '1rem' }}>{submitError}</p>}

          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setStep('profession')}>
              ← {ar ? 'رجوع' : 'Back'}
            </button>
            <button className="btn-primary" onClick={submitApplication} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {ar ? 'جاري الإرسال...' : 'Submitting...'}
                </>
              ) : (
                <>
                  {pricing.finalPrice === 0
                    ? ar ? 'إرسال الطلب المجاني →' : 'Submit free application →'
                    : ar ? 'إرسال الطلب والدفع →' : 'Submit application & pay →'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Screen */}
      {step === 'confirmation' && submitResult && (
        <div className="form-step result-step">
          <div className="tier-icon" style={{ fontSize: '3rem' }}><Check size={48} color="#2a9d8f" /></div>
          <h2>{ar ? 'تم استلام طلبك!' : 'Application received!'}</h2>
          <p className="tier-subtitle">
            {ar ? `رقم الطلب: ${submitResult.applicationId}` : `Application ref: ${submitResult.applicationId}`}
          </p>
          <p className="step-description">{submitResult.message}</p>
          <div className="form-actions" style={{ marginTop: '1.5rem' }}>
            <a className="btn-primary" href={submitResult.notionUrl} target="_blank" rel="noopener noreferrer">
              {ar ? 'عرض في Notion' : 'View in Notion'}
            </a>
            <a className="btn-secondary" href="https://t.me/BrainSAITForgeBot" target="_blank" rel="noopener noreferrer">
              {ar ? 'فتح بوت Forge' : 'Open Forge Bot'}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
