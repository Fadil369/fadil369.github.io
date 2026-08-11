import { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import {
  calculatePrice,
  formatPrice,
  type EligibilityData,
  type PricingResult,
  BASE_PRICE,
} from '../utils/pricingEngine';
import { useI18n } from '../i18n';
import '../styles/BuildEligibilityForm.css';

type FormStep = 'welcome' | 'identity' | 'profession' | 'verification' | 'result' | 'checkout';

export default function BuildEligibilityForm() {
  const { ar, t } = useI18n();
  const [step, setStep] = useState<FormStep>('welcome');
  const [data, setData] = useState<EligibilityData>({});
  const [verificationFile, setVerificationFile] = useState<File | null>(null);

  const pricing = useMemo(() => calculatePrice(data), [data]);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setVerificationFile(e.target.files[0]);
    }
  };

  const handleProceedToPayment = () => {
    const shopifyUrl = 'https://store.brainsait.org/products/brainsait-incubation-program';
    window.location.href = shopifyUrl;
  };

  const isIdentityTier = pricing.eligibilityId === 'sa_sd_free';
  const requiresVerification = data.identity === 'SA' || data.identity === 'SD';

  return (
    <div className="build-form-container">
      {/* Welcome Screen */}
      {step === 'welcome' && (
        <div className="form-step welcome-step">
          <h2>{ar ? 'ابنِ شيئاً مهماً' : 'Build something that matters'}</h2>
          <p className="step-subtitle">
            {ar
              ? 'تذكرة البناء الخاصة بك: السعر 9,630 ريال سعودي'
              : 'Your Build Ticket: SAR 9,630'}
          </p>

          <p className="step-description">
            {ar
              ? 'لكنك قد تستحق استحقاق بناء خاص.'
              : 'But you may qualify for a special Build Benefit.'}
          </p>

          <button
            className="btn-primary"
            onClick={() => setStep('identity')}
          >
            {ar ? 'تحقق من استحقاقي →' : 'Check my eligibility →'}
          </button>
        </div>
      )}

      {/* Identity Selection */}
      {step === 'identity' && (
        <div className="form-step identity-step">
          <h2>{ar ? 'من أنت؟' : 'Who are you?'}</h2>
          <p className="step-subtitle">
            {ar ? 'اختر هويتك' : 'Select your identity'}
          </p>

          <div className="options-grid">
            <button
              className={'option-card' + (data.identity === 'SA' ? ' selected' : '')}
              onClick={() => handleIdentitySelect('SA')}
            >
              <div className="option-icon">🇸🇦</div>
              <div className="option-label">
                {ar ? 'سعودي' : 'Saudi'}
              </div>
            </button>

            <button
              className={'option-card' + (data.identity === 'SD' ? ' selected' : '')}
              onClick={() => handleIdentitySelect('SD')}
            >
              <div className="option-icon">🇸🇩</div>
              <div className="option-label">
                {ar ? 'سوداني' : 'Sudanese'}
              </div>
            </button>

            <button
              className={'option-card' + (data.identity === 'OTHER' ? ' selected' : '')}
              onClick={() => handleIdentitySelect('OTHER')}
            >
              <div className="option-icon">🌍</div>
              <div className="option-label">
                {ar ? 'دولي' : 'International'}
              </div>
            </button>
          </div>

          <button
            className="btn-secondary"
            onClick={() => setStep('welcome')}
          >
            ← {ar ? 'رجوع' : 'Back'}
          </button>
        </div>
      )}

      {/* Professional Status */}
      {step === 'profession' && (
        <div className="form-step profession-step">
          <h2>{ar ? 'ماذا تفعل؟' : 'What do you do?'}</h2>
          <p className="step-subtitle">
            {ar ? 'اختر فئتك المهنية' : 'Select your professional category'}
          </p>

          <div className="options-grid">
            <button
              className={'option-card' + (data.profession === 'doctor' ? ' selected' : '')}
              onClick={() => handleProfessionSelect('doctor')}
            >
              <div className="option-icon">👨‍⚕️</div>
              <div className="option-label">
                {ar ? 'طبيب' : 'Doctor'}
              </div>
            </button>

            <button
              className={'option-card' + (data.profession === 'nurse' ? ' selected' : '')}
              onClick={() => handleProfessionSelect('nurse')}
            >
              <div className="option-icon">👩‍⚕️</div>
              <div className="option-label">
                {ar ? 'ممرضة' : 'Nurse'}
              </div>
            </button>

            <button
              className={'option-card' + (data.profession === 'healthcare' ? ' selected' : '')}
              onClick={() => handleProfessionSelect('healthcare')}
            >
              <div className="option-icon">🏥</div>
              <div className="option-label">
                {ar ? 'متخصص صحي آخر' : 'Other Healthcare'}
              </div>
            </button>

            <button
              className={'option-card' + (data.category === 'entrepreneur' ? ' selected' : '')}
              onClick={() => handleCategorySelect('entrepreneur')}
            >
              <div className="option-icon">⚔️</div>
              <div className="option-label">
                {ar ? 'رائد أعمال' : 'Warrior Entrepreneur'}
              </div>
            </button>

            <button
              className={'option-card' + (data.category === 'student' ? ' selected' : '')}
              onClick={() => handleCategorySelect('student')}
            >
              <div className="option-icon">🎓</div>
              <div className="option-label">
                {ar ? 'طالب' : 'Student'}
              </div>
            </button>

            <button
              className={'option-card' + (data.category === 'researcher' ? ' selected' : '')}
              onClick={() => handleCategorySelect('researcher')}
            >
              <div className="option-icon">🔬</div>
              <div className="option-label">
                {ar ? 'باحث' : 'Researcher'}
              </div>
            </button>

            <button
              className={'option-card' + (data.profession === 'other' ? ' selected' : '')}
              onClick={() => handleProfessionSelect('other')}
            >
              <div className="option-icon">🚀</div>
              <div className="option-label">
                {ar ? 'آخر' : 'Other'}
              </div>
            </button>
          </div>

          <button
            className="btn-secondary"
            onClick={() => setStep('identity')}
          >
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
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="file-input"
                />
                {verificationFile && (
                  <p className="file-name">{verificationFile.name}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="verification-form">
              {data.category === 'entrepreneur' && (
                <>
                  <div className="form-field">
                    <label>
                      {ar ? 'اسم الشركة أو المشروع' : 'Company or Project Name'}
                    </label>
                    <input
                      type="text"
                      placeholder={ar ? 'اسم المشروع' : 'Your project name'}
                      value={data.organizationName || ''}
                      onChange={(e) => updateData({ organizationName: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>
                      {ar ? 'موقع ويب أو LinkedIn' : 'Website or LinkedIn'}
                    </label>
                    <input
                      type="url"
                      placeholder={ar ? 'رابط المشروع' : 'Your project URL'}
                      value={data.website || ''}
                      onChange={(e) => updateData({ website: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>
                      {ar ? 'ماذا تبني؟' : 'What are you building?'}
                    </label>
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
                <>
                  <div className="form-field">
                    <label>
                      {ar ? 'اسم الجامعة' : 'University Name'}
                    </label>
                    <input
                      type="text"
                      placeholder={ar ? 'جامعتك' : 'Your university'}
                      value={data.universityName || ''}
                      onChange={(e) => updateData({ universityName: e.target.value })}
                    />
                  </div>
                </>
              )}

              {data.category === 'researcher' && (
                <>
                  <div className="form-field">
                    <label>
                      {ar ? 'مجال البحث' : 'Research Area'}
                    </label>
                    <input
                      type="text"
                      placeholder={ar ? 'مجال بحثك' : 'Your research area'}
                      value={data.buildingDescription || ''}
                      onChange={(e) => updateData({ buildingDescription: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <div className="form-actions">
            <button
              className="btn-secondary"
              onClick={() => setStep('profession')}
            >
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
          {isIdentityTier ? (
            <>
              <div className="tier-icon">{pricing.tier.icon}</div>
              <h2>
                {ar
                  ? `تذكرة البناء الخاصة بك من عندنا`
                  : `Your Build Ticket is on us`}
              </h2>
              <p className="tier-subtitle">
                {ar
                  ? 'لأنك من المملكة العربية السعودية أو السودان، تستحق استحقاق البناء بنسبة 100٪.'
                  : 'Because of your Saudi/Sudanese identity, you qualify for a 100% Build Benefit.'}
              </p>
            </>
          ) : (
            <>
              <div className="tier-icon">{pricing.tier.icon}</div>
              <h2>{ar ? pricing.tier.titleAr : pricing.tier.titleEn}</h2>
              <p className="tier-subtitle">
                {ar
                  ? `أنت مؤهل للحصول على خصم ${pricing.discount}%`
                  : `You qualify for a ${pricing.discount}% discount`}
              </p>
            </>
          )}

          <div className="price-display">
            <div className="price-row original">
              <span>{ar ? 'السعر الأصلي' : 'Original Price'}</span>
              <span className="price crossed">
                {formatPrice(pricing.originalPrice, ar)}
              </span>
            </div>

            {pricing.discount > 0 && (
              <div className="price-row discount">
                <span>{ar ? `الخصم ${pricing.discount}%` : `Discount ${pricing.discount}%`}</span>
                <span className="price-savings">
                  −{formatPrice(pricing.savings, ar)}
                </span>
              </div>
            )}

            <div className="price-row final">
              <span className="label-final">
                {ar ? 'تذكرة البناء الخاصة بك' : 'Your Build Ticket'}
              </span>
              <span className="price-final">
                {pricing.finalPrice === 0
                  ? ar ? 'مجاني' : 'FREE'
                  : formatPrice(pricing.finalPrice, ar)}
              </span>
            </div>
          </div>

          <div className="form-actions">
            <button
              className="btn-secondary"
              onClick={() => setStep('profession')}
            >
              ← {ar ? 'رجوع' : 'Back'}
            </button>
            <button
              className="btn-primary"
              onClick={handleProceedToPayment}
            >
              {pricing.finalPrice === 0
                ? ar ? 'أكمل التحقق →' : 'Complete verification →'
                : ar ? 'الذهاب إلى الدفع →' : 'Go to payment →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
