import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Building2, FileCheck2, Landmark, Network, Package, Cpu } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout } from '../../components/BprKit';

// Public overview: where BPR could fit in the Saudi health system. Proposals only — no meetings,
// statuses, notes or pipeline data (those live in the owner's private roadshow tool).
type Org = { en: string; ar: string; valueEn: string; valueAr: string; needsEn: string; needsAr: string };
const GROUPS: { icon: typeof Landmark; en: string; ar: string; orgs: Org[] }[] = [
  { icon: Landmark, en: 'Payers & health insurance', ar: 'الجهات الدافعة والتأمين الصحي', orgs: [
    { en: 'Center for National Health Insurance', ar: 'مركز التأمين الصحي الوطني', valueEn: 'A verifiable provider-identity layer for value-based purchasing.', valueAr: 'طبقة هوية مهنية قابلة للتحقق لدعم الشراء الاستراتيجي.', needsEn: 'SCFHS credential feed', needsAr: 'بيانات اعتمادات الهيئة' },
    { en: 'Council of Health Insurance', ar: 'مجلس الضمان الصحي', valueEn: 'FHIR R4 PractitionerRole and signed credentials that NPHIES-era systems can read instead of re-keying.', valueAr: 'موارد FHIR R4 واعتمادات موقّعة تقرؤها أنظمة نفيس بدل إعادة الإدخال.', needsEn: 'SCFHS licensing and CHI accreditation links', needsAr: 'الربط مع ترخيص الهيئة واعتماد المجلس' },
    { en: 'Tawuniya', ar: 'التعاونية', valueEn: 'Provider identity and privilege checks before claim adjudication.', valueAr: 'التحقق من هوية مقدم الرعاية وامتيازاته قبل البت في المطالبات.', needsEn: 'Privilege data from providers', needsAr: 'بيانات الامتيازات من المنشآت' },
    { en: 'Bupa Arabia', ar: 'بوبا العربية', valueEn: 'A verified-provider index behind referral routing.', valueAr: 'فهرس موثق لمقدمي الرعاية لدعم توجيه الإحالات.', needsEn: 'Specialty data via SCFHS', needsAr: 'بيانات التخصص عبر الهيئة' },
  ] },
  { icon: FileCheck2, en: 'Licensing & quality', ar: 'الترخيص والجودة', orgs: [
    { en: 'Saudi Commission for Health Specialties', ar: 'الهيئة السعودية للتخصصات الصحية', valueEn: 'An API-first FHIR R4 identity layer on top of SCFHS classification, verifiable on any phone.', valueAr: 'طبقة هوية بمعيار FHIR R4 فوق تصنيف الهيئة، يُتحقق منها من أي هاتف.', needsEn: 'The official SCFHS credential integration BPR is waiting on', needsAr: 'التكامل الرسمي مع اعتمادات الهيئة الذي ينتظره BPR' },
    { en: 'CBAHI', ar: 'سباهي', valueEn: 'Credential monitoring for medical-staff credentialing and privileging, with a signed audit trail.', valueAr: 'متابعة الاعتمادات لمعايير اعتماد الكادر الطبي وامتيازاته، مع سجل تدقيق موقّع.', needsEn: 'SCFHS credentials and hospital privilege data', needsAr: 'اعتمادات الهيئة وبيانات امتيازات المستشفيات' },
  ] },
  { icon: Building2, en: 'Health system', ar: 'المنظومة الصحية', orgs: [
    { en: 'Ministry of Health', ar: 'وزارة الصحة', valueEn: 'A synchronisation layer between licensing, clinician profiles and NPHIES.', valueAr: 'طبقة مزامنة بين الترخيص وملفات الممارسين ونفيس.', needsEn: 'Official data links', needsAr: 'الربط الرسمي للبيانات' },
    { en: 'Health Holding Company', ar: 'شركة الصحة القابضة', valueEn: 'One signed identity per clinician across clusters, with privileges recorded per hospital.', valueAr: 'هوية موقّعة واحدة لكل ممارس عبر التجمعات، مع تسجيل الامتيازات لكل مستشفى.', needsEn: 'Cluster privilege data', needsAr: 'بيانات الامتيازات من التجمعات' },
    { en: 'Saudi Health Council & NHIC', ar: 'المجلس الصحي السعودي والمركز الوطني للمعلومات الصحية', valueEn: 'Provider identifiers aligned with the national health data dictionary and health exchange.', valueAr: 'معرّفات ممارسين متوافقة مع قاموس البيانات الصحية الوطني والتبادل الصحي.', needsEn: 'Identifier alignment', needsAr: 'مواءمة المعرّفات' },
  ] },
  { icon: Package, en: 'Supply & product regulation', ar: 'الإمداد وتنظيم المنتجات', orgs: [
    { en: 'NUPCO', ar: 'نوبكو', valueEn: 'Prescriber-identity checks for e-prescribing.', valueAr: 'التحقق من هوية الواصف في الوصفات الإلكترونية.', needsEn: 'Specialty verification via SCFHS', needsAr: 'التحقق من التخصص عبر الهيئة' },
    { en: 'Saudi Food & Drug Authority', ar: 'الهيئة العامة للغذاء والدواء', valueEn: 'Human-in-the-loop clinical AI (drafts only, signed provenance) as a basis for SaMD discussions.', valueAr: 'ذكاء اصطناعي سريري بإشراف بشري (مسودات فقط، منشأ موقّع) أساسًا لنقاش البرمجيات كأجهزة طبية.', needsEn: 'Regulatory pathway', needsAr: 'المسار التنظيمي' },
  ] },
  { icon: Cpu, en: 'Digital government & AI', ar: 'الحكومة الرقمية والذكاء الاصطناعي', orgs: [
    { en: 'Digital Government Authority', ar: 'هيئة الحكومة الرقمية', valueEn: 'BPR and its FHIR modules as candidate digital public goods.', valueAr: 'BPR ووحدات FHIR منتجات رقمية عامة مرشحة.', needsEn: 'Reference-architecture alignment', needsAr: 'المواءمة مع البنية المرجعية' },
    { en: 'SDAIA', ar: 'سدايا', valueEn: 'Public-facts-only credentials and on-premise Arabic clinical AI with a signed provenance ledger.', valueAr: 'اعتمادات ببيانات عامة فقط وذكاء اصطناعي سريري عربي محلي مع سجل منشأ موقّع.', needsEn: 'PDPL alignment review', needsAr: 'مراجعة المواءمة مع نظام حماية البيانات' },
    { en: 'Lean Business Services', ar: 'لين لخدمات الأعمال', valueEn: 'An integrable identity service: public JSON and FHIR R4 APIs plus an embeddable live check.', valueAr: 'خدمة هوية قابلة للتكامل: واجهات JSON وFHIR R4 عامة وبطاقة تحقق قابلة للتضمين.', needsEn: 'Product integration', needsAr: 'التكامل مع المنتجات' },
  ] },
];

export default function Saudi() {
  const { ar } = useI18n();
  usePageMeta({
    title: ar ? 'BPR في المنظومة الصحية السعودية' : 'BPR across the Saudi health system',
    description: ar ? 'أين يمكن أن يخدم سجل برينسايت لمقدمي الرعاية الجهات الصحية السعودية — مقترحات، مع بيان ما يعمل اليوم وما يعتمد عليه كل تكامل.' : 'Where the BrainSAIT Provider Registry could serve Saudi health organisations — proposals, with what runs today and what each integration depends on.',
    url: '/bpr/saudi', type: 'website',
  });
  return (
    <BprLayout kicker={ar ? 'المملكة العربية السعودية' : 'Saudi Arabia'}
      title={ar ? 'هوية مهنية واحدة قابلة للتحقق في أرجاء المنظومة الصحية.' : 'One verifiable identity, across the health system.'}
      lead={ar
        ? 'كيف يمنح BPR كل جهة صحية في المملكة هوية مهنية موثوقة لكوادرها — وما الذي يفتحه كل تكامل من قيمة.'
        : 'How BPR gives every Saudi health organisation trusted professional identity for its workforce — and what each integration unlocks.'}
      actions={<><Link className="profile-button primary" to="/bpr/developers">{ar ? 'استكشف واجهات التكامل' : 'Explore integration APIs'}<ArrowRight size={16} /></Link><a className="profile-button secondary" href="https://calendar.app.google/rAqiE6pNumtECdnd7" target="_blank" rel="noreferrer">{ar ? 'احجز عرضًا توضيحيًا مباشرًا' : 'Book a live demo'}<ArrowUpRight size={16} /></a></>}>
      <section className="ksa-today">
        <div><span className="ws-status live">{ar ? 'يعمل اليوم' : 'Live today'}</span><p>{ar ? 'اعتماد W3C موقّع يُتحقق منه من أي هاتف · سجل شفاف عام · واجهة FHIR R4 · مساحة OpenEMR خاصة لكل مقدم رعاية' : 'Signed W3C credential verifiable on any phone · public transparency log · FHIR R4 API · private per-provider OpenEMR workspace'}</p></div>
        <div><span className="ws-status awaiting">{ar ? 'تكامل جارٍ' : 'Ongoing integration'}</span><p>{ar ? 'التحقق من اعتمادات الهيئة السعودية للتخصصات الصحية' : 'SCFHS credential verification'}</p></div>
        <div><span className="ws-status awaiting">{ar ? 'تكامل جارٍ' : 'Ongoing integration'}</span><p>{ar ? 'التكامل مع نفيس' : 'NPHIES integration'}</p></div>
      </section>
      {GROUPS.map(({ icon: Icon, ...g }) => (
        <section key={g.en} className="bpr-section">
          <div className="profile-section-label"><Icon size={13} /> {ar ? g.ar : g.en}</div>
          <div className="ws-grid">
            {g.orgs.map((o) => (
              <article key={o.en} className="ws-card planned">
                <div className="ws-card-top"><Network size={20} /><span className="ws-status planned">{ar ? 'فرصة' : 'Opportunity'}</span></div>
                <h3>{ar ? o.ar : o.en}</h3>
                <p className="ksa-alt"><bdi>{ar ? o.en : o.ar}</bdi></p>
                <p>{ar ? o.valueAr : o.valueEn}</p>
                <small className="ksa-needs">{ar ? 'يُفعَّل بـ: ' : 'Unlocked by: '}{ar ? o.needsAr : o.needsEn}</small>
              </article>
            ))}
          </div>
        </section>
      ))}
      <p className="bpr-note">{ar ? 'مقترحات للنقاش مع كل جهة.' : 'Proposals for discussion with each organisation.'}</p>
    </BprLayout>
  );
}
