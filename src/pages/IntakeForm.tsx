import { useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Building2, CheckCircle2, Clock3, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n';
import { useSearchParams } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';
import '../styles/intake.css';

const WEBHOOK_URL = 'https://api.brainsait.de/intake';
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
  solutions_ready: { name: 'Solutions Ready / BPR Organization', nameAr: 'حلول جاهزة / سجل المؤسسة', price: '24,000 SAR', url: `${STORE}/collections/solutions-ready` },
  nphies_discovery: { name: 'NPHIES facility readiness & integration scoping', nameAr: 'تقييم جاهزية المنشأة ونطاق تكامل نفيس', price: 'Scope and proposal after discovery', url: 'https://calendar.app.google/BrainSAIT48hSprint' }
};

type OfferKey = keyof typeof OFFERS;

function getLocalRouting(data: FormData): OfferKey[] {
  if (data.main_interest === 'nphies_fhir') return ['nphies_discovery'];
  if (data.main_interest === 'build_sprint' || data.customer_type === 'founder' || data.customer_type === 'student') {
    return ['build', 'strategy'];
  }

  if (data.main_interest === 'bpr_registry' || data.customer_type === 'doctor' || data.customer_type === 'nurse') {
    return data.budget === '19900' || data.budget === '24000_plus'
      ? ['bpr_elite', 'strategy']
      : ['bpr_pro', 'strategy'];
  }

  if (data.main_interest === 'solutions_ready' || data.customer_type === 'clinic_owner' || data.customer_type === 'hospital_leader') {
    return ['solutions_ready', 'strategy'];
  }

  return ['strategy'];
}

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

function ThankYouPage({ data }: { data: { name: string; routing: OfferKey[]; receiptId: string } }) {
  const { ar } = useI18n();
  const recs = data.routing.map((r: OfferKey) => OFFERS[r]).filter(Boolean);

  return (
    <main className="intake-page">
      <section className="intake-success" aria-labelledby="intake-success-title">
        <span className="intake-success-icon" aria-hidden="true"><CheckCircle2 size={34} /></span>
        <h1 id="intake-success-title">
          {ar ? `شكراً ${data.name}!` : `Thank You, ${data.name}!`}
        </h1>
        <p className="intake-success-copy">
          {ar
            ? 'تم استلام طلبك. سيراجع فريق BrainSAIT معلومات المنشأة ومسارات العمل التي اخترتها، ثم يتواصل معك عبر البريد الإلكتروني.'
            : 'Your request was received. The BrainSAIT team will review your facility and selected workflows, then follow up by email.'}
        </p>
        <p className="intake-receipt">
          {ar ? 'رقم التأكيد' : 'Confirmation ID'}: <code>{data.receiptId}</code>
        </p>
        {recs.map((offer, i) => (
          <a key={i} href={offer.url} target="_blank" rel="noopener noreferrer"
             className="intake-offer-link">
            <div>{ar ? offer.nameAr : offer.name}</div>
            <div className="intake-offer-price">{offer.price}</div>
          </a>
        ))}
        <p className="intake-footnote">
          BrainSAIT OID Root: 1.3.6.1.4.1.61026 · SCFHS remains the official licensing authority
        </p>
      </section>
    </main>
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
  facility_name: string;
  facility_type: string;
  ehr_system: string;
  nphies_status: string;
  workflows: string[];
}

export default function IntakeForm() {
  const { ar } = useI18n();
  const [searchParams] = useSearchParams();
  const nphiesInquiry = searchParams.get('nphies') === '1';
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '', email: '', phone: '', country: '',
    customer_type: '', main_interest: nphiesInquiry ? 'nphies_fhir' : '', budget: '', urgency: '',
    facility_name: '', facility_type: '', ehr_system: '', nphies_status: 'unknown', workflows: []
  });
  const isNphiesInterest = nphiesInquiry || formData.main_interest === 'nphies_fhir';
  usePageMeta({
    title: ar ? (isNphiesInterest ? 'تقييم جاهزية نفيس للمنشآت الصحية — BrainSAIT' : 'تواصل مع BrainSAIT') : (isNphiesInterest ? 'NPHIES facility readiness — BrainSAIT' : 'Contact BrainSAIT'),
    description: ar ? 'اطلب تقييمًا لتكامل نفيس للعيادات والمستشفيات. لا ترسل بيانات مرضى أو بيانات اعتماد.' : 'Request an authorized NPHIES integration readiness assessment for a clinic or hospital. Do not submit patient data or credentials.',
    url: '/intake', type: 'website',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; routing?: OfferKey[] } | null>(null);
  const [thankYouData, setThankYouData] = useState<{ name: string; routing: OfferKey[]; receiptId: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setSubmitting(true);
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.status === 'processed' && typeof data?.receipt_id === 'string') {
        const isNphies = nphiesInquiry || formData.main_interest === 'nphies_fhir';
        const routing = isNphies ? ['nphies_discovery'] as OfferKey[] : (data.routing || []).map((r: string) => r as OfferKey);
        setResult({ ok: true, routing });
        setThankYouData({ name: formData.name || 'Friend', routing: routing.length ? routing : getLocalRouting(formData), receiptId: data.receipt_id });
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
    <main className={`intake-page${isNphiesInterest ? ' intake-page--nphies' : ''}`} dir={ar ? 'rtl' : 'ltr'}>
      <div className="intake-wrap">
        <header className="intake-hero">
          <div className="intake-hero-copy">
          {!isNphiesInterest && <p className="intake-kicker"><Clock3 size={15} />{ar ? 'ابدأ بخطوة واضحة' : 'A clear first step'}</p>}
          <h1>
            {ar
              ? isNphiesInterest ? 'تقييم جاهزية نفيس لمنشأتك' : 'ساعدنا في فهم احتياجاتك الصحية'
              : isNphiesInterest ? 'NPHIES readiness for your facility' : 'Help Us Understand Your Healthcare AI Needs'}
          </h1>
          <p className="intake-hero-lead">
            {ar
              ? isNphiesInterest ? 'شارك احتياج منشأتك لتحديد نطاق تكامل نفيس المصرح به. لا تدخل بيانات مرضى أو بيانات اعتماد.' : 'املأ هذا النموذج السريع وسنرشدك إلى أسرع طريقة للبدء مع BrainSAIT — جلسة استراتيجية، BUILD، BPR، أو حلول جاهزة.'
              : isNphiesInterest ? 'Share your facility and workflow needs to scope an authorized NPHIES integration. Do not enter patient information or credentials.' : 'Fill this quick form and we will guide you to the fastest way to start with BrainSAIT.'}
          </p>
          {isNphiesInterest && <div className="intake-trust-row">
            <span><ShieldCheck size={16}/>{ar ? 'دون بيانات مرضى' : 'No patient data'}</span>
            <span><LockKeyhole size={16}/>{ar ? 'متابعة عبر البريد' : 'Email follow-up'}</span>
          </div>}
          </div>
          {isNphiesInterest && <aside className="intake-process" aria-label={ar ? 'خطوات التقييم' : 'Assessment steps'}>
            <h2>{ar ? 'ما الذي ستشاركه؟' : 'What you’ll share'}</h2>
            <ol>
              <li><span>01</span>{ar ? 'جهة التواصل والمنشأة' : 'Your contact and facility'}</li>
              <li><span>02</span>{ar ? 'النظام ومسارات العمل' : 'Your system and workflows'}</li>
              <li><span>03</span>{ar ? 'تأكيد ورقم متابعة' : 'Receipt and reference ID'}</li>
            </ol>
            <p><Building2 size={15}/>{ar ? 'لا نطلب سجلات مرضى أو بيانات دخول' : 'No patient records or credentials requested'}</p>
          </aside>}
        </header>

        <nav className="intake-stepper" aria-label={ar ? 'خطوات النموذج' : 'Form steps'}>
          {[1, 2].map((s) => <div key={s} className={`intake-step${step === s ? ' is-current' : step > s ? ' is-complete' : ''}`} aria-current={step === s ? 'step' : undefined}>
            <span className="intake-step-number">{step > s ? <CheckCircle2 size={17}/> : `0${s}`}</span>
            <span>{s === 1 ? (ar ? 'بيانات التواصل' : 'Contact details') : (ar ? 'جاهزية المنشأة' : 'Facility readiness')}</span>
          </div>)}
        </nav>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <form className="intake-card" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
            <div className="intake-section-heading"><span>01</span><div><h2>{ar ? 'بيانات التواصل' : 'Contact details'}</h2><p>{ar ? 'أخبرنا بمن نتواصل معه وبأي منشأة.' : 'Tell us who to contact and which facility this is for.'}</p></div></div>
            <div className="intake-fields">
            <div className="intake-field"><label htmlFor="intake-name">{ar ? 'الاسم الكامل *' : 'Full name *'}</label>
            <input id="intake-name" autoComplete="name" required placeholder={ar ? 'الاسم الكامل' : 'Full name'} value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
            </div>
            <div className="intake-field"><label htmlFor="intake-email">{ar ? 'البريد الإلكتروني *' : 'Work email *'}</label>
            <input id="intake-email" autoComplete="email" required type="email" placeholder="name@facility.org" value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
            </div>
            <div className="intake-field"><label htmlFor="intake-phone">{ar ? 'الهاتف / واتساب (اختياري)' : 'Phone / WhatsApp (optional)'}</label>
            <input id="intake-phone" autoComplete="tel" type="tel" placeholder="+966…" value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
            </div>
            <div className="intake-field"><label htmlFor="intake-country">{ar ? 'المدينة / الدولة (اختياري)' : 'City / country (optional)'}</label>
            <input id="intake-country" autoComplete="country-name" placeholder={ar ? 'الرياض، السعودية' : 'Riyadh, Saudi Arabia'} value={formData.country}
              onChange={e => setFormData({...formData, country: e.target.value})}
            />
            </div>
            </div>
            {isNphiesInterest && <div className="intake-notice" role="note"><ShieldCheck size={18}/><p>{ar ? 'نستخدم هذه المعلومات لتقييم متطلبات التكامل فقط. لا تدخل بيانات مرضى أو كلمات مرور أو أرقام هويات.' : 'These details are used to scope the integration only. Do not enter patient data, passwords, or identity numbers.'}</p></div>}
            <div className="intake-actions intake-actions--end">
              <button type="submit" className="intake-button primary">{ar ? 'متابعة إلى الجاهزية' : 'Continue to readiness'}<ArrowRight size={17}/></button>
            </div>
          </form>
        )}

        {/* Step 2: Qualification */}
        {step === 2 && (
          <form className="intake-card" onSubmit={handleSubmit}>
            <div className="intake-section-heading"><span>02</span><div><h2>{ar ? 'جاهزية المنشأة' : 'Facility readiness'}</h2><p>{ar ? 'اختر أقرب وصف لوضع المنشأة الحالي.' : 'Choose the closest match for your facility today.'}</p></div></div>
            <div className="intake-fields">

            <div>
              <label className="intake-label" htmlFor="intake-customer-type">
                {ar ? 'نوع العميل *' : 'Customer Type *'}
              </label>
              <select id="intake-customer-type" className="intake-control" required value={formData.customer_type}
                onChange={e => setFormData({...formData, customer_type: e.target.value})}
              >
                <option value="">{ar ? 'اختر...' : 'Select...'}</option>
                {CUSTOMER_TYPES.map(t => <option key={t.value} value={t.value}>{ar ? t.ar : t.en}</option>)}
              </select>
            </div>

            {nphiesInquiry ? <div className="intake-field">
              <span className="intake-label">{ar ? 'مسار التكامل' : 'Integration focus'}</span>
              <span className="intake-fixed-value"><ShieldCheck size={16}/>NPHIES / FHIR</span>
            </div> : <div>
              <label className="intake-label" htmlFor="intake-main-interest">
                {ar ? 'الاهتمام الرئيسي *' : 'Main Interest *'}
              </label>
              <select id="intake-main-interest" className="intake-control" required value={formData.main_interest}
                onChange={e => setFormData({...formData, main_interest: e.target.value})}
              >
                <option value="">{ar ? 'اختر...' : 'Select...'}</option>
                {MAIN_INTERESTS.map(i => <option key={i.value} value={i.value}>{ar ? i.ar : i.en}</option>)}
              </select>
            </div>}

            {!isNphiesInterest && <div>
              <label className="intake-label" htmlFor="intake-budget">
                {ar ? 'الاستعداد للميزانية *' : 'Budget Readiness *'}
              </label>
              <select id="intake-budget" className="intake-control" required value={formData.budget}
                onChange={e => setFormData({...formData, budget: e.target.value})}
              >
                <option value="">{ar ? 'اختر...' : 'Select...'}</option>
                {BUDGET_RANGES.map(b => <option key={b.value} value={b.value}>{ar ? b.ar : b.en}</option>)}
              </select>
            </div>}
            {isNphiesInterest && <div className="intake-field intake-field--wide">
              <label className="intake-label" htmlFor="intake-facility-name">{ar ? 'اسم المنشأة *' : 'Facility name *'}</label>
              <input id="intake-facility-name" className="intake-control" required maxLength={120} autoComplete="organization" placeholder={ar ? 'اسم المنشأة أو المجموعة' : 'Facility or group name'} value={formData.facility_name} onChange={e => setFormData({...formData, facility_name: e.target.value})}/>
            </div>}
            {isNphiesInterest && <div className="intake-field">
              <label className="intake-label" htmlFor="intake-facility-type">{ar ? 'نوع المنشأة *' : 'Facility type *'}</label>
              <select id="intake-facility-type" className="intake-control" required value={formData.facility_type} onChange={e => setFormData({...formData, facility_type: e.target.value})}>
                <option value="">{ar ? 'اختر نوع المنشأة' : 'Select facility type'}</option>
                {[['clinic','Clinic / medical centre','عيادة / مركز طبي'],['hospital','Hospital','مستشفى'],['pharmacy','Pharmacy','صيدلية'],['dental','Dental','أسنان'],['optical','Optical','بصريات'],['other','Other','أخرى']].map(([value,en,arLabel]) => <option key={value} value={value}>{ar ? arLabel : en}</option>)}
              </select>
            </div>}
            {isNphiesInterest && <div className="intake-field">
              <label className="intake-label" htmlFor="intake-nphies-status">{ar ? 'حالة الانضمام إلى نفيس' : 'NPHIES onboarding status'}</label>
              <select id="intake-nphies-status" className="intake-control" value={formData.nphies_status} onChange={e => setFormData({...formData, nphies_status: e.target.value})}>
                <option value="unknown">{ar ? 'غير معروف / أحتاج إلى إرشاد' : 'Unknown / need guidance'}</option>
                <option value="not_started">{ar ? 'لم يبدأ' : 'Not started'}</option>
                <option value="onboarding">{ar ? 'قيد الانضمام' : 'Onboarding in progress'}</option>
                <option value="sandbox">{ar ? 'لدي وصول إلى بيئة اختبار' : 'Sandbox access available'}</option>
                <option value="production">{ar ? 'لدي وصول إنتاجي' : 'Production access available'}</option>
              </select>
            </div>}
            {isNphiesInterest && <div className="intake-field intake-field--wide">
              <label className="intake-label" htmlFor="intake-ehr">{ar ? 'نظام السجلات / المطالبات (اختياري)' : 'EHR / claims system (optional)'}</label>
              <input id="intake-ehr" className="intake-control" maxLength={120} placeholder={ar ? 'مثال: OpenEMR أو نظام المنشأة' : 'e.g. OpenEMR or facility system'} value={formData.ehr_system} onChange={e => setFormData({...formData, ehr_system: e.target.value})}/>
              <small className="intake-help">{ar ? 'اسم النظام فقط؛ لا تدخل بيانات دخول أو بيانات مرضى.' : 'System name only; never enter credentials or patient information.'}</small>
            </div>}
            {isNphiesInterest && <fieldset className="intake-workflows intake-field--wide">
              <legend>{ar ? 'مسارات العمل ذات الأولوية (اختياري)' : 'Priority workflows (optional)'}</legend>
              <div className="intake-workflow-options">
                {[
                  ['eligibility', 'Eligibility', 'الأهلية'], ['authorization', 'Prior authorization', 'الموافقات المسبقة'],
                  ['claims', 'Claims', 'المطالبات'], ['rejections', 'Responses / rejections', 'الردود / الرفض'],
                ].map(([value,en,arLabel]) => <label key={value} className="intake-choice"><input type="checkbox" checked={formData.workflows.includes(value)} onChange={e => setFormData({...formData, workflows: e.target.checked ? [...formData.workflows, value] : formData.workflows.filter(w => w !== value)})}/><span>{ar ? arLabel : en}</span></label>)}
              </div>
            </fieldset>}

            <div>
              <label className="intake-label" htmlFor="intake-urgency">
                {ar ? 'مستوى الاستعجال *' : 'Urgency *'}
              </label>
              <select id="intake-urgency" className="intake-control" required value={formData.urgency}
                onChange={e => setFormData({...formData, urgency: e.target.value})}
              >
                <option value="">{ar ? 'اختر...' : 'Select...'}</option>
                {URGENCIES.map(u => <option key={u.value} value={u.value}>{ar ? u.ar : u.en}</option>)}
              </select>
            </div>
            </div>

            {!isNphiesInterest && <div className="intake-field intake-field--wide"><p className="intake-help">{ar ? 'يرسل فريق BrainSAIT رسالة متابعة إلى بريد التواصل بعد مراجعة اختياراتك.' : 'The BrainSAIT team will follow up at your contact email after reviewing your selections.'}</p></div>}
            {isNphiesInterest && <div className="intake-notice" role="note"><LockKeyhole size={18}/><p>{ar ? 'يرسل النموذج بيانات التواصل وخيارات المنشأة فقط إلى فريق BrainSAIT عبر البريد. لا تُرفق ملفات، ولا تدخل بيانات مرضى أو كلمات مرور.' : 'This form sends contact details and facility selections only to the BrainSAIT team by email. No files are uploaded. Do not enter patient information or passwords.'}</p></div>}
            <div className="intake-actions">
              <button type="button" className="intake-button secondary" onClick={() => { setStep(1); setResult(null); }}><ArrowLeft size={17}/>{ar ? 'رجوع' : 'Back'}</button>
              <button type="submit" className="intake-button primary" disabled={submitting}>
                {submitting ? <><span className="intake-spinner" aria-hidden="true"/>{ar ? 'جارٍ الإرسال…' : 'Sending…'}</> : <>{ar ? 'إرسال طلب التقييم' : 'Send readiness request'}<ArrowRight size={17}/></>}
              </button>
            </div>
          </form>
        )}

        {/* Error */}
        {result && !result.ok && (
          <div className="intake-error" role="alert">
            <AlertCircle size={18} />
            <span>{ar ? 'تعذر تأكيد استلام الطلب. أعد المحاولة أو أرسل تفاصيل جهة الاتصال فقط عبر ' : 'We could not confirm receipt. Retry, or email your contact details only to '}<a href={`mailto:hello@brainsait.de?subject=${encodeURIComponent(isNphiesInterest ? 'NPHIES facility readiness inquiry' : 'BrainSAIT inquiry')}`} style={{ color: '#fff', textDecoration: 'underline' }}>hello@brainsait.de</a>. {ar ? 'لا ترسل بيانات مرضى أو كلمات مرور.' : 'Do not email patient data or passwords.'}</span>
          </div>
        )}
      </div>
    </main>
  );
}
