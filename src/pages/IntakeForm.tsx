import { useState } from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { useI18n } from '../i18n';

const WEBHOOK_URL = 'https://lead-capture.brainsait-fadil.workers.dev/intake';
const SECRET = 'BS_LEAD_WEBHOOK_2026';
const STORE = 'https://store.brainsait.de';

interface Offer {
  name: string;
  nameAr: string;
  price: string;
  url: string;
}

const OFFERS: Record<string, Offer> = {
  strategy: { name: 'Private Strategy Session', nameAr: 'الجلسة الاستراتيجية الخاصة', price: '2,390 SAR', url: 'https://calendar.app.google/BrainSAIT48hSprint' },
  build: { name: 'BUILD Ticket — Incubation Pass', nameAr: 'تذكرة BUILD — برنامج الاحتضان', price: '9,630 SAR', url: `${STORE}/products/build-full-program-ticket` },
  bpr_pro: { name: 'BPR AI Professional', nameAr: 'BPR AI مهني', price: '4,900-9,900 SAR/yr', url: `${STORE}/products/provider-registry` },
  bpr_elite: { name: 'BPR AI Elite', nameAr: 'BPR AI نخبة', price: '19,900 SAR/yr', url: `${STORE}/products/provider-registry` },
  solutions_ready: { name: 'Solutions Ready / BPR Organization', nameAr: 'حلول جاهزة / سجل المؤسسة', price: '24,000 SAR', url: `${STORE}/collections/solutions-ready` }
};

type OfferKey = keyof typeof OFFERS;

const CUSTOMER_TYPES = [
  { value: 'doctor', en: 'Doctor', ar: 'طبيب' },
  { value: 'nurse', en: 'Nurse', ar: 'ممرض' },
  { value: 'clinic_owner', en: 'Clinic Owner', ar: 'مدير عيادة' },
  { value: 'hospital_leader', en: 'Hospital Leader', ar: 'قائد مستشفى' },
  { value: 'founder', en: 'Founder', ar: 'مؤسس' },
  { value: 'student', en: 'Student', ar: 'طالب' },
  { value: 'partner', en: 'Partner', ar: 'شريك' },
  { value: 'other', en: 'Other', ar: 'أخرى' }
];

const MAIN_INTERESTS = [
  { value: 'bpr_registry', en: 'BPR Provider Registry', ar: 'سجل مقدمي الرعاية BPR' },
  { value: 'clinical_ai_chatbot', en: 'Clinical AI Chatbot', ar: 'مساعدة ذكاء سريري' },
  { value: 'build_sprint', en: 'BUILD Sprint', ar: 'برنامج BUILD' },
  { value: 'nphies_fhir', en: 'NPHIES/FHIR Interoperability', ar: 'التوافق NPHIES/FHIR' },
  { value: 'clinic_automation', en: 'Clinic Automation', ar: 'أتمتة العيادة' },
  { value: 'solutions_ready', en: 'Solutions Ready', ar: 'حلول جاهزة' },
  { value: 'partnership', en: 'Partnership', ar: 'شراكة' }
];

const BUDGET_RANGES = [
  { value: 'under_2390', en: 'Under 2,390 SAR', ar: 'أقل من 2,390 ريال' },
  { value: '2390', en: '2,390 SAR', ar: '2,390 ريال' },
  { value: '4900_9900', en: '4,900-9,900 SAR', ar: '4,900-9,900 ريال' },
  { value: '9630', en: '9,630 SAR', ar: '9,630 ريال' },
  { value: '19900', en: '19,900 SAR', ar: '19,900 ريال' },
  { value: '24000_plus', en: '24,000+ SAR', ar: '24,000+ ريال' }
];

const URGENCIES = [
  { value: 'today', en: 'Today', ar: 'اليوم' },
  { value: 'this_week', en: 'This Week', ar: 'هذا الأسبوع' },
  { value: 'this_month', en: 'This Month', ar: 'هذا الشهر' },
  { value: 'exploring', en: 'Just Exploring', ar: 'أستكشف فقط' }
];

function ThankYouPage({ data }: { data: { name: string; routing: OfferKey[] } }) {
  const { ar } = useI18n();
  const recs = data.routing.map((r: OfferKey) => OFFERS[r]).filter(Boolean);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 700 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h1 style={{ fontSize: '2rem', marginBottom: 16 }}>
          {ar ? `شكراً ${data.name}!` : `Thank You, ${data.name}!`}
        </h1>
        <p style={{ color: '#64748b', marginBottom: 32, fontSize: '1.1rem', lineHeight: 1.6 }}>
          {ar
            ? 'تلقت BrainSAIT طلبك. سنراجع احتياجاتك ونرشدك إلى أسرع خطوة تالية. إذا كنت جاهزاً الآن، ابدأ بالجلسة الاستراتيجية.'
            : 'BrainSAIT received your request. We will review your needs and guide you to the fastest next step. If you are ready now, start with the Private Strategy Session.'}
        </p>
        {recs.map((offer, i) => (
          <a key={i} href={offer.url} target="_blank" rel="noopener noreferrer"
             style={{ display: 'block', margin: '0.75rem auto', padding: '1rem 1.5rem', background: '#0f172a', color: '#fff', textDecoration: 'none', borderRadius: 12, fontWeight: 600, border: '2px solid #0ea5e9', maxWidth: 500, cursor: 'pointer' }}>
            <div>{ar ? offer.nameAr : offer.name}</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 400, color: '#94a3b8' }}>{offer.price}</div>
          </a>
        ))}
        <p style={{ marginTop: 32, color: '#94a3b8', fontSize: '0.85rem' }}>
          BrainSAIT OID Root: 1.3.6.1.4.1.61026 · SCFHS remains the official licensing authority
        </p>
      </div>
    </div>
  );
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  country: string;
  customer_type: string;
  main_interest: string;
  budget: string;
  urgency: string;
  message: string;
}

export default function IntakeForm() {
  const { ar } = useI18n();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '', email: '', phone: '', country: '',
    customer_type: '', main_interest: '', budget: '', urgency: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; routing?: OfferKey[] } | null>(null);
  const [thankYouData, setThankYouData] = useState<{ name: string; routing: OfferKey[] } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': SECRET },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.status === 'processed') {
        const routing = (data.routing || []).map((r: string) => r as OfferKey);
        setResult({ ok: true, routing });
        setThankYouData({ name: formData.name || 'Friend', routing });
        setStep(3);
      } else {
        setResult({ ok: false });
      }
    } catch {
      setResult({ ok: false });
    }
    setSubmitting(false);
  };

  if (step === 3 && thankYouData) {
    return <ThankYouPage data={thankYouData} />;
  }

  return (
    <main style={{ minHeight: '100vh', padding: '3rem 1.5rem', background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1e40af', color: '#fff', padding: '6px 16px', borderRadius: 20, fontSize: '0.85rem', marginBottom: 16 }}>
            <Clock size={14} />
            {ar ? 'سباق 48 ساعة — تقدم الآن' : '48-Hour Sprint — Apply Now'}
          </div>
          <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>
            {ar
              ? 'ساعدنا في فهم احتياجاتك الصحية'
              : 'Help Us Understand Your Healthcare AI Needs'}
          </h1>
          <p style={{ color: '#94a3b8', lineHeight: 1.6, maxWidth: 500, margin: '0 auto' }}>
            {ar
              ? 'املأ هذا النموذج السريع وسنرشدك إلى أسرع طريقة للبدء مع BrainSAIT — جلسة استراتيجية، BUILD، BPR، أو حلول جاهزة.'
              : 'Fill this quick form and we will guide you to the fastest way to start with BrainSAIT.'}
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: s <= step ? '#0ea5e9' : '#334155'
            }} />
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: 4 }}>
              {ar ? '📋 المعلومات الأساسية' : '📋 Basic Information'}
            </h2>

            <input required placeholder={ar ? 'الاسم الكامل *' : 'Full Name *'} value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: '1rem', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#0ea5e9'}
              onBlur={e => e.target.style.borderColor = '#334155'}
            />

            <input required type="email" placeholder={ar ? 'البريد الإلكتروني *' : 'Email Address *'} value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: '1rem', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#0ea5e9'}
              onBlur={e => e.target.style.borderColor = '#334155'}
            />

            <input placeholder={ar ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp (optional)'} value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: '1rem', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#0ea5e9'}
              onBlur={e => e.target.style.borderColor = '#334155'}
            />

            <input placeholder={ar ? 'المدينة / الدولة' : 'City / Country (optional)'} value={formData.country}
              onChange={e => setFormData({...formData, country: e.target.value})}
              style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: '1rem', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#0ea5e9'}
              onBlur={e => e.target.style.borderColor = '#334155'}
            />

            <button type="submit" style={{
              padding: '14px', borderRadius: 10, border: 'none', background: '#0ea5e9',
              color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', marginTop: 8
            }}>
              {ar ? 'التالي →' : 'Next →'}
            </button>
          </form>
        )}

        {/* Step 2: Qualification */}
        {step === 2 && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: 4 }}>
              {ar ? '🎯 معلومات التأهيل' : '🎯 Qualification Details'}
            </h2>

            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.9rem', display: 'block', marginBottom: 8 }}>
                {ar ? 'نوع العميل *' : 'Customer Type *'}
              </label>
              <select required value={formData.customer_type}
                onChange={e => setFormData({...formData, customer_type: e.target.value})}
                style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: formData.customer_type ? '#fff' : '#94a3b8', fontSize: '1rem', width: '100%' }}>
                <option value="">{ar ? 'اختر...' : 'Select...'}</option>
                {CUSTOMER_TYPES.map(t => <option key={t.value} value={t.value}>{ar ? t.ar : t.en}</option>)}
              </select>
            </div>

            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.9rem', display: 'block', marginBottom: 8 }}>
                {ar ? 'الاهتمام الرئيسي *' : 'Main Interest *'}
              </label>
              <select required value={formData.main_interest}
                onChange={e => setFormData({...formData, main_interest: e.target.value})}
                style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: formData.main_interest ? '#fff' : '#94a3b8', fontSize: '1rem', width: '100%' }}>
                <option value="">{ar ? 'اختر...' : 'Select...'}</option>
                {MAIN_INTERESTS.map(i => <option key={i.value} value={i.value}>{ar ? i.ar : i.en}</option>)}
              </select>
            </div>

            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.9rem', display: 'block', marginBottom: 8 }}>
                {ar ? 'الاستعداد للميزانية *' : 'Budget Readiness *'}
              </label>
              <select required value={formData.budget}
                onChange={e => setFormData({...formData, budget: e.target.value})}
                style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: formData.budget ? '#fff' : '#94a3b8', fontSize: '1rem', width: '100%' }}>
                <option value="">{ar ? 'اختر...' : 'Select...'}</option>
                {BUDGET_RANGES.map(b => <option key={b.value} value={b.value}>{ar ? b.ar : b.en}</option>)}
              </select>
            </div>

            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.9rem', display: 'block', marginBottom: 8 }}>
                {ar ? 'مستوى الاستعجال *' : 'Urgency *'}
              </label>
              <select required value={formData.urgency}
                onChange={e => setFormData({...formData, urgency: e.target.value})}
                style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: formData.urgency ? '#fff' : '#94a3b8', fontSize: '1rem', width: '100%' }}>
                <option value="">{ar ? 'اختر...' : 'Select...'}</option>
                {URGENCIES.map(u => <option key={u.value} value={u.value}>{ar ? u.ar : u.en}</option>)}
              </select>
            </div>

            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.9rem', display: 'block', marginBottom: 8 }}>
                {ar ? 'وصف مشكلتك أو احتياجك' : 'Describe Your Problem or Need'}
              </label>
              <textarea rows={4} placeholder={ar ? 'اكتب هنا...' : 'Write here...'} value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
                style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: '1rem', width: '100%', resize: 'vertical', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#0ea5e9'}
                onBlur={e => e.target.style.borderColor = '#334155'}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button type="button" onClick={() => setStep(1)}
                style={{ padding: '14px 24px', borderRadius: 10, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', flex: 1 }}>
                {ar ? '↩ رجوع' : '↩ Back'}
              </button>
              <button type="submit" disabled={submitting}
                style={{
                  padding: '14px 32px', borderRadius: 10, border: 'none',
                  background: submitting ? '#64748b' : '#0ea5e9', color: '#fff',
                  fontSize: '1rem', fontWeight: 600, cursor: 'pointer', flex: 2
                }}>
                {submitting ? (ar ? 'جاري الإرسال...' : 'Submitting...') : (ar ? 'إرسال الطلب ✓' : 'Submit Request ✓')}
              </button>
            </div>
          </form>
        )}

        {/* Error */}
        {result && !result.ok && (
          <div style={{ marginTop: 24, padding: 16, background: '#7f1d1d', borderRadius: 10, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} />
            {ar ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.'}
          </div>
        )}
      </div>
    </main>
  );
}
