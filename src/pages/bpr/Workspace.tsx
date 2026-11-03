import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, BookOpenCheck, Bot, Calculator, CalendarClock, ClipboardList, FileSearch, FlaskConical, GraduationCap,
  HeartHandshake, Hourglass, Layers, Mic, Network, Pill, Server, ShieldAlert, Shuffle, Stethoscope, UsersRound,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, CheckRow, ScfhsPending, SourceBadge } from '../../components/BprKit';
import { AiLedger, checkAiLedger, REGISTRY, short } from '../../lib/bpr';

// The provider workspace, capability by capability. Status is stated per card and must match what
// actually runs (see ~/BRAINSAIT-ESTATE.md): "live" = running today; "awaiting" = integration in
// progress (SCFHS, NPHIES), shown as "Ongoing integration"; "planned" = coming next, not built yet.
type Status = 'live' | 'awaiting' | 'planned';
interface Cap { icon: typeof Bot; status: Status; roles?: boolean; en: string; ar: string; enText: string; arText: string; facts?: [string, string][]; link?: { to?: string; href?: string; en: string; ar: string } }

const GROUPS: { en: string; ar: string; caps: Cap[] }[] = [
  {
    en: 'Clinical core', ar: 'النواة السريرية', caps: [
      { icon: Server, status: 'planned', en: 'OpenEMR workspace', ar: 'مساحة OpenEMR',
        enText: 'A public demo workspace is available with synthetic data. Member-specific provisioning, SMART launch and write-back are not verified from this site.',
        arText: 'تتوفر مساحة عرض عامة ببيانات مصطنعة. لم يتم التحقق من تجهيز مساحة عضو أو إطلاق SMART أو حفظ البيانات من هذا الموقع.',
        facts: [['Public demo: demo.emr.brainsait.de', 'عرض عام: demo.emr.brainsait.de'], ['No patient data in the public clinic pilot', 'لا بيانات مرضى في تجربة العيادة العامة']],
        link: { href: 'https://demo.emr.brainsait.de/', en: 'Open synthetic-data demo', ar: 'افتح العرض ببيانات مصطنعة' } },
      { icon: Bot, status: 'planned', en: 'Clinical Copilot', ar: 'المساعد السريري',
        enText: 'The clinic pilot uses approved local rules only. The private gateway catalog and service checks do not verify clinical inference or an OpenEMR connection.',
        arText: 'تستخدم تجربة العيادة قواعد محلية معتمدة فقط. لا يثبت فهرس البوابة الخاصة وفحوص الخدمة نجاح الاستدلال السريري أو الاتصال بـOpenEMR.',
        facts: [['No model calls from the public reception demo', 'لا تستدعي تجربة الاستقبال العامة أي نموذج']],
        link: { to: '/bpr/ai', en: 'Review AI and model status', ar: 'راجع حالة الذكاء والنماذج' } },
      { icon: Mic, status: 'planned', en: 'Arabic voice agent', ar: 'وكيل الاستقبال الصوتي',
        enText: 'Voice capture and speech processing are not enabled in the public clinic. A speech provider, hosting boundary and retention policy must be verified before activation.',
        arText: 'لم يتم تفعيل التقاط الصوت أو معالجته في العيادة العامة. يجب التحقق من مزود الكلام وحدود الاستضافة وسياسة الاحتفاظ قبل التفعيل.',
        facts: [['No microphone permission requested by the public clinic', 'لا تطلب العيادة العامة إذن الميكروفون']] },
      { icon: ShieldAlert, status: 'planned', en: 'Clinical safety checks', ar: 'فحوص السلامة السريرية',
        enText: 'Clinical decision support is not enabled in the public reception pilot. Keep this workflow administrative and route medical questions to qualified staff.',
        arText: 'دعم القرار السريري غير مفعّل في تجربة الاستقبال العامة. يقتصر هذا المسار على الأمور الإدارية ويوجّه الأسئلة الطبية إلى مختص.' },
    ],
  },
  {
    en: 'Integration', ar: 'التكامل', caps: [
      { icon: Layers, status: 'live', en: 'FHIR R4', ar: 'FHIR R4',
        enText: 'The registry publishes provider resources through a FHIR R4 API. A SMART-on-FHIR connection between a member EMR and Copilot is not verified here.',
        arText: 'ينشر السجل موارد مقدمي الرعاية عبر واجهة FHIR R4. لم يتم التحقق هنا من اتصال SMART-on-FHIR بين سجل العضو والمساعد.',
        link: { to: '/bpr/developers', en: 'FHIR & API', ar: 'FHIR والواجهات' } },
      { icon: Network, status: 'planned', en: 'NPHIES transactions', ar: 'معاملات نفيس',
        enText: 'The NPHIES desk offers public reference material and a local pre-check. Eligibility, pre-authorisation and claims are not connected.',
        arText: 'يوفر مكتب نفيس مراجع عامة وفحصًا محليًا أوليًا. الأهلية والموافقات المسبقة والمطالبات غير متصلة.' },
      { icon: BookOpenCheck, status: 'planned', en: 'SCFHS credential check', ar: 'التحقق من اعتماد الهيئة',
        enText: 'No live SCFHS data connection is verified. Licence and qualifications must remain “not assessed” until an authorised integration is available.',
        arText: 'لم يتم التحقق من اتصال حي ببيانات الهيئة. يجب أن يظل الترخيص والمؤهلات «لم تُقيَّم» حتى توفر تكامل معتمد.' },
    ],
  },
  {
    en: 'Tools & knowledge', ar: 'الأدوات والمعرفة', caps: [
      { icon: Calculator, status: 'live', en: 'Specialty toolkit', ar: 'أدوات التخصص',
        enText: 'Checklists, pre-filled forms and templates, and clinical calculators (eGFR, CHA₂DS₂-VASc, NEWS2, SOFA…) matched to your specialty, printable on A4 with a live verification QR. Reference aids — checked against local protocol.',
        arText: 'قوائم تحقق ونماذج وقوالب معبأة مسبقًا وحاسبات سريرية (eGFR وCHA₂DS₂-VASc وNEWS2 وSOFA…) حسب تخصصك، قابلة للطباعة على A4 مع رمز تحقق مباشر. أدوات مرجعية — تُراجع وفق البروتوكول المحلي.',
        facts: [['13 specialty kits', '13 حزمة تخصصية'], ['15 calculators — eGFR, CHA₂DS₂-VASc, NEWS2, SOFA…', '15 حاسبة — eGFR وCHA₂DS₂-VASc وNEWS2 وSOFA…'], ['Checklists, pre-filled forms and templates', 'قوائم تحقق ونماذج وقوالب معبأة'], ['A4 print with live verification QR', 'طباعة A4 مع رمز تحقق مباشر']],
        link: { href: `${REGISTRY}/tools.php`, en: 'Members', ar: 'للأعضاء' } },
      { icon: FlaskConical, status: 'live', en: 'Research page', ar: 'صفحة البحث',
        enText: 'Your works matched by DOI across ORCID, Zenodo and Hugging Face, counted only when the publisher names your ORCID iD.',
        arText: 'أعمالك مطابقة عبر DOI من ORCID وZenodo وHugging Face، وتُحتسب فقط عندما يذكر الناشر معرّف ORCID الخاص بك.',
        link: { to: '/bpr/research', en: 'Research', ar: 'البحث' } },
      { icon: FileSearch, status: 'live', en: 'NPHIES desk', ar: 'مكتب نفيس',
        enText: 'Every official rejection code in plain Arabic and English, an on-device message pre-check and a readiness plan by facility type. A reference only: it does not send transactions.',
        arText: 'كل رموز الرفض الرسمية بعربية وإنجليزية واضحتين، وفحص أولي للرسائل على جهازك، وخطة جاهزية حسب نوع المنشأة. وهو مرجع فقط ولا يرسل معاملات.',
        link: { to: '/bpr/nphies', en: 'Open the desk', ar: 'افتح المكتب' } },
      { icon: Pill, status: 'live', en: 'Knowledge hub', ar: 'مركز المعرفة',
        enText: 'Drug lookup (RxNorm) and a curated reference shelf.', arText: 'بحث الأدوية (RxNorm) ورف مراجع منتقاة.',
        link: { href: `${REGISTRY}/knowledge.php`, en: 'Open', ar: 'افتح' } },
    ],
  },
  {
    en: 'Teams, teaching & work', ar: 'الفرق والتعليم والعمل', caps: [
      { icon: HeartHandshake, status: 'planned', en: 'Peer-to-peer review', ar: 'مراجعة الأقران',
        enText: 'Request and give structured case and note reviews between providers, recorded against each provider’s BPR identity.',
        arText: 'طلب وتقديم مراجعات منظمة للحالات والملاحظات بين مقدمي الرعاية، تُسجَّل على هوية BPR لكل منهم.' },
      { icon: UsersRound, status: 'planned', en: 'Your care team', ar: 'فريق الرعاية الخاص بك',
        enText: 'Choose or onboard nurses, respiratory therapists, receptionists and other staff into your workspace, each with their own role and access.',
        arText: 'اختر أو أضف ممرضين وأخصائيي علاج تنفسي وموظفي استقبال وغيرهم إلى مساحة عملك، لكل منهم دوره وصلاحياته.', roles: true },
      { icon: GraduationCap, status: 'planned', en: 'Mentoring & training', ar: 'الإرشاد والتدريب',
        enText: 'Mentor colleagues and run training sessions using the same tools, calculators and cases.',
        arText: 'أرشد الزملاء وأدر جلسات تدريبية باستخدام الأدوات والحاسبات والحالات نفسها.' },
      { icon: CalendarClock, status: 'planned', en: 'Hospital slots marketplace', ar: 'سوق شواغر المستشفيات',
        enText: 'Hospitals publish openings with their fees up front; you request them with your SPID. Launching soon.',
        arText: 'تنشر المستشفيات فرصها مع الرسوم معلنة من البداية، وتطلبها أنت بمعرّف SPID. ينطلق قريبًا.',
        link: { to: '/slots', en: 'See what’s coming', ar: 'اطّلع على ما هو قادم' } },
      { icon: Shuffle, status: 'planned', en: 'Shift cover & smart matching', ar: 'تغطية المناوبات والمطابقة الذكية',
        enText: 'Publish a shift you need covered and match it to a suitable provider — and match doctors in training to mentors and rotations.',
        arText: 'انشر مناوبة تحتاج إلى تغطيتها وطابقها مع مقدم الرعاية المناسب — وطابق الأطباء المتدربين مع المرشدين والتدويرات.' },
    ],
  },
];

// What every provider gets — one row per capability, in the order the owner listed them.
const CHECKLIST: { status: Status; en: string; ar: string; enText: string; arText: string; to?: string; href?: string }[] = [
  { status: 'live', en: 'A complete, intelligent workspace', ar: 'مساحة عمل ذكية متكاملة', enText: 'One BPR identity opens everything below.', arText: 'هوية BPR واحدة تفتح كل ما يلي.', to: '/bpr/p/SA-PHY-000003' },
  { status: 'planned', en: 'Member OpenEMR provisioning', ar: 'تجهيز OpenEMR للأعضاء', enText: 'A synthetic-data public demo is linked; member provisioning and clinic write-back need verification.', arText: 'يرتبط عرض عام ببيانات مصطنعة؛ يلزم التحقق من تجهيز الأعضاء وحفظ بيانات العيادة.' },
  { status: 'planned', en: 'Clinical Copilot', ar: 'المساعد السريري', enText: 'No clinical model inference is enabled in the public reception pilot.', arText: 'لم يتم تفعيل استدلال نموذج سريري في تجربة الاستقبال العامة.' },
  { status: 'planned', en: 'Reception voice agent', ar: 'وكيل الاستقبال الصوتي', enText: 'Voice processing is disabled until provider, hosting and retention are verified.', arText: 'معالجة الصوت معطّلة حتى التحقق من المزود والاستضافة والاحتفاظ.' },
  { status: 'live', en: 'FHIR registry API', ar: 'واجهة FHIR للسجل', enText: 'The public registry FHIR R4 API is documented and available. EMR SMART launch is not verified here.', arText: 'واجهة FHIR R4 العامة للسجل موثقة ومتاحة. لم يتم التحقق من إطلاق SMART من السجل الطبي هنا.', to: '/bpr/developers' },
  { status: 'live', en: 'NPHIES desk', ar: 'مكتب نفيس', enText: 'Rejection codes explained, an on-device message pre-check and a readiness plan. A reference, not a connection to NPHIES.', arText: 'شرح رموز الرفض، وفحص أولي للرسائل على جهازك، وخطة جاهزية. وهو مرجع وليس اتصالًا بنفيس.', to: '/bpr/nphies' },
  { status: 'planned', en: 'NPHIES transaction connection', ar: 'الاتصال بمعاملات نفيس', enText: 'The desk is reference and local pre-check only; no NPHIES transactions are sent.', arText: 'المكتب للمراجع والفحص المحلي الأولي فقط؛ ولا تُرسل معاملات إلى نفيس.' },
  { status: 'live', en: 'Research page integration', ar: 'التكامل مع صفحة البحث', enText: 'DOI-matched works from ORCID, Zenodo and Hugging Face on your profile.', arText: 'أعمالك المطابقة عبر DOI من ORCID وZenodo وHugging Face في ملفك.', to: '/bpr/research/SA-PHY-000003' },
  { status: 'live', en: 'Calculators, forms & clinical tools', ar: 'الحاسبات والنماذج والأدوات السريرية', enText: 'Specialty kits with calculators, checklists, pre-filled forms and templates, printable with a verification QR.', arText: 'حزم تخصصية بحاسبات وقوائم تحقق ونماذج وقوالب معبأة، قابلة للطباعة مع رمز تحقق.', href: `${REGISTRY}/tools.php` },
  { status: 'planned', en: 'SCFHS credential check', ar: 'التحقق من اعتماد الهيئة', enText: 'No live authorised connection is verified; licence status remains not assessed.', arText: 'لم يتم التحقق من اتصال حي معتمد؛ وتظل حالة الترخيص لم تُقيّم.' },
  { status: 'planned', en: 'Peer-to-peer review', ar: 'مراجعة الأقران', enText: 'Structured case and note review between providers.', arText: 'مراجعة منظمة للحالات والملاحظات بين مقدمي الرعاية.' },
  { status: 'planned', en: 'Choose or onboard your team', ar: 'اختيار فريقك أو ضمّه', enText: 'Nurses, respiratory therapists, receptionists and more — each with a role and access.', arText: 'ممرضون وأخصائيو علاج تنفسي وموظفو استقبال وغيرهم — لكل دوره وصلاحياته.' },
  { status: 'planned', en: 'Mentoring & training sessions', ar: 'الإرشاد وجلسات التدريب', enText: 'Teach with the same tools, calculators and cases.', arText: 'التدريب بالأدوات والحاسبات والحالات نفسها.' },
  { status: 'planned', en: 'Request hospital slots', ar: 'اطلب شواغر المستشفيات', enText: 'Request organization-published openings with your SPID — the marketplace launches soon.', arText: 'اطلب الفرص التي تنشرها المؤسسات بمعرّف SPID — والسوق ينطلق قريبًا.', to: '/slots' },
  { status: 'planned', en: 'Matching for providers & trainees', ar: 'المطابقة لمقدمي الرعاية والمتدربين', enText: 'Providers to slots and teams; doctors in training to mentors and rotations.', arText: 'مقدمو الرعاية مع الفترات والفرق؛ والأطباء المتدربون مع المرشدين والتدويرات.' },
];

const DAY: { status: Status; en: string; ar: string; enText: string; arText: string }[] = [
  { status: 'planned', en: 'Before the visit', ar: 'قبل الزيارة', enText: 'A future Copilot could prepare a bilingual pre-visit brief from appointments after an authenticated EMR connection is verified.', arText: 'يمكن لمساعد مستقبلي إعداد ملخص ثنائي اللغة قبل الزيارة بعد التحقق من اتصال موثّق بالسجل الطبي.' },
  { status: 'planned', en: 'During the visit', ar: 'أثناء الزيارة', enText: 'Voice notes and clinical decision support are not active in this public demo. Route medical questions to qualified staff.', arText: 'الملاحظات الصوتية ودعم القرار السريري غير نشطين في هذا العرض العام. وجّه الأسئلة الطبية إلى المختصين.' },
  { status: 'planned', en: 'After the visit', ar: 'بعد الزيارة', enText: 'No visit data is written from this site to OpenEMR. A production workflow needs authenticated access, review and an audited write path.', arText: 'لا تُحفظ بيانات الزيارة من هذا الموقع في OpenEMR. يحتاج المسار الإنتاجي إلى دخول موثّق ومراجعة ومسار حفظ مدقّق.' },
  { status: 'planned', en: 'Grow', ar: 'النمو', enText: 'Research, peer review, mentoring, teams and open slots remain separate capabilities with their own readiness checks.', arText: 'تظل الأبحاث ومراجعة الأقران والإرشاد والفرق والفترات المتاحة قدرات منفصلة ولكل منها فحوص جاهزية.' },
];

const SKILLS: { en: string; ar: string; items: [string, string][] }[] = [
  { en: 'Voice', ar: 'الصوت', items: [['Ambient scribe → SOAP', 'كاتب تلقائي ← SOAP'], ['Dictate into any field', 'الإملاء في أي حقل']] },
  { en: 'Files', ar: 'الملفات', items: [['12-month timeline', 'خط زمني لـ12 شهرًا'], ['Classify documents', 'تصنيف المستندات']] },
  { en: 'Labs', ar: 'المختبر', items: [['Extract to FHIR Observation', 'استخراج إلى FHIR Observation'], ['Trends & deltas', 'الاتجاهات والفروق']] },
  { en: 'Radiology', ar: 'الأشعة', items: [['Structure the report', 'هيكلة التقرير'], ['Image assist (review required)', 'مساعدة بالصور (تتطلب مراجعة)']] },
  { en: 'Medications', ar: 'الأدوية', items: [['Reconcile home vs active', 'مطابقة المنزلية والحالية'], ['Safety (Sentinel rules)', 'السلامة (قواعد Sentinel)']] },
  { en: 'Diagnosis', ar: 'التشخيص', items: [['ICD-10-AM suggestions', 'اقتراحات ICD-10-AM'], ['Care gaps', 'فجوات الرعاية']] },
  { en: 'Communication', ar: 'التواصل', items: [['Arabic-first patient education', 'تثقيف المريض بالعربية أولًا'], ['Referral letters', 'خطابات الإحالة']] },
];

const ROLES: [string, string][] = [['Nurses', 'ممرضون'], ['Respiratory therapists', 'أخصائيو العلاج التنفسي'], ['Receptionists', 'موظفو الاستقبال'], ['Pharmacists', 'صيادلة'], ['Lab technicians', 'فنيو المختبر'], ['Medical coders / RCM', 'مرمّزون طبيون / دورة الإيرادات'], ['Doctors in training', 'أطباء متدربون']];

const STATUS: Record<Status, [string, string]> = { live: ['Live today', 'يعمل اليوم'], awaiting: ['Ongoing integration', 'تكامل جارٍ'], planned: ['Coming next', 'قادمًا'] };

export default function Workspace() {
  const { ar } = useI18n();
  const [ai, setAi] = useState<AiLedger | null>(null);
  const [aiErr, setAiErr] = useState(false);
  useEffect(() => { checkAiLedger().then(setAi, () => setAiErr(true)); }, []);
  usePageMeta({
    title: ar ? 'مساحة عمل مقدم الرعاية — BPR' : 'Provider workspace — BPR',
      description: ar ? 'نظرة عملية على عرض OpenEMR ومراجع FHIR ومكتب نفيس، مع توضيح ما لم يُفعّل بعد.' : 'A practical view of the OpenEMR demo, FHIR references and NPHIES desk, with capabilities not yet enabled clearly marked.',
    url: '/bpr/workspace', type: 'website',
  });
  const counts = GROUPS.flatMap((g) => g.caps).reduce((a, c) => ({ ...a, [c.status]: (a[c.status] || 0) + 1 }), {} as Record<Status, number>);

  return (
    <BprLayout kicker={ar ? 'مساحة العمل' : 'Provider workspace'}
      title={ar ? 'مساحة عمل صحية بحالة واضحة لكل تكامل.' : 'A healthcare workspace with clear integration status.'}
      lead={ar
        ? 'استكشف عرض OpenEMR ببيانات مصطنعة، وواجهة FHIR العامة، ومراجع نفيس. يميّز كل قسم بين ما يعمل في هذا الموقع وما يحتاج إلى تكامل موثّق.'
        : 'Explore the synthetic-data OpenEMR demo, public FHIR API and NPHIES references. Each section distinguishes what works on this site from integrations that still need verification.'}
      actions={<>
        <Link className="profile-button primary" to="/bpr/join">{ar ? 'انضم واحصل على مساحتك' : 'Join and get your workspace'}<ArrowRight size={16} /></Link>
        <a className="profile-button secondary" href="https://demo.emr.brainsait.de/" target="_blank" rel="noreferrer">{ar ? 'جرّب السجل التجريبي (بيانات مصطنعة)' : 'Try the demo EMR (synthetic data)'}<ArrowUpRight size={16} /></a>
        <a className="profile-button secondary" href="https://calendar.app.google/rAqiE6pNumtECdnd7" target="_blank" rel="noreferrer">{ar ? 'احجز عرضًا توضيحيًا مباشرًا' : 'Book a live workspace demo'}<ArrowRight size={16} /></a>
      </>}>
      <div className="ws-legend" role="list" aria-label={ar ? 'دليل الحالات' : 'Status legend'}>
        {(Object.keys(STATUS) as Status[]).map((s) => <span key={s} role="listitem" className={`ws-status ${s}`}>{s === 'awaiting' && <Hourglass size={12} />}{STATUS[s][ar ? 1 : 0]} · {counts[s] || 0}</span>)}
      </div>

      <section className="ws-checklist" aria-labelledby="ws-get">
        <h2 id="ws-get">{ar ? 'ما يحصل عليه كل مقدم رعاية' : 'What every provider gets'}</h2>
        <ol>
          {CHECKLIST.map((c) => {
            const body = <><span className={`ws-status ${c.status}`}>{c.status === 'awaiting' && <Hourglass size={11} />}{STATUS[c.status][ar ? 1 : 0]}</span><strong>{ar ? c.ar : c.en}</strong><small>{ar ? c.arText : c.enText}</small></>;
            return <li key={c.en} className={c.status}>{c.to ? <Link to={c.to}>{body}<ArrowRight size={14} /></Link> : c.href ? <a href={c.href} target="_blank" rel="noreferrer">{body}<ArrowUpRight size={14} /></a> : <div>{body}</div>}</li>;
          })}
        </ol>
      </section>

      <section className="bpr-section">
        <div className="profile-section-label">{ar ? 'يوم في مساحة العمل' : 'A day in the workspace'}</div>
        <ol className="ws-day">
          {DAY.map((d, i) => (
            <li key={d.en} className={d.status}>
              <span className="ws-day-n">{String(i + 1).padStart(2, '0')}</span>
              <div><div className="ws-day-head"><h3>{ar ? d.ar : d.en}</h3><span className={`ws-status ${d.status}`}>{STATUS[d.status][ar ? 1 : 0]}</span></div><p>{ar ? d.arText : d.enText}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="bpr-section">
        <div className="profile-section-label">{ar ? 'مهارات مقترحة للمساعد · غير مفعّلة' : 'Proposed Copilot skills · not enabled'}</div>
        <div className="ws-skills">
          {SKILLS.map((g) => (
            <div key={g.en}><h3>{ar ? g.ar : g.en}</h3><ul>{g.items.map(([en, a]) => <li key={en}><Bot size={13} aria-hidden="true" />{ar ? a : en}</li>)}</ul></div>
          ))}
        </div>
        <p className="bpr-note">{ar ? 'هذه قائمة تصميمية لقدرات مقترحة وليست ميزات متاحة في هذا الموقع. لا تُرسل بيانات المرضى إلى نموذج من هذه الصفحة.' : 'This is a design inventory of proposed capabilities, not a feature set available on this site. This page sends no patient data to a model.'}</p>
      </section>

      <section className="ws-hero" aria-label={ar ? 'مخطط مساحة العمل' : 'Workspace map'}>
        <div className="ws-core"><Stethoscope size={28} /><strong>{ar ? 'مقدم الرعاية' : 'Provider'}</strong><code dir="ltr">SA-PHY-000003</code><small>{ar ? 'هوية BPR موقّعة' : 'Signed BPR identity'}</small></div>
        {[[Server, 'OpenEMR', 'OpenEMR', 'planned'], [Bot, 'Copilot', 'المساعد', 'planned'], [Mic, 'Arabic voice', 'الصوت العربي', 'planned'], [Layers, 'FHIR R4', 'FHIR R4', 'live'], [Calculator, 'Tools', 'الأدوات', 'live'], [FlaskConical, 'Research', 'البحث', 'live'], [Network, 'NPHIES', 'نفيس', 'planned'], [UsersRound, 'Team', 'الفريق', 'planned'], [GraduationCap, 'Mentoring', 'الإرشاد', 'planned'], [CalendarClock, 'Hospital slots', 'شواغر المستشفيات', 'planned']].map(([Icon, en, a, st], i) => {
          const I = Icon as typeof Bot;
          return <div key={en as string} className={`ws-node ${st}`} style={{ ['--i' as string]: i }}><I size={18} /><span>{ar ? a as string : en as string}</span></div>;
        })}
      </section>

      {GROUPS.map((g) => (
        <section key={g.en} className="bpr-section">
          <div className="profile-section-label">{ar ? g.ar : g.en}</div>
          <div className="ws-grid">
            {g.caps.map(({ icon: Icon, ...c }) => (
              <article key={c.en} className={`ws-card ${c.status}`}>
                <div className="ws-card-top"><Icon size={22} /><span className={`ws-status ${c.status}`}>{c.status === 'awaiting' && <Hourglass size={11} />}{STATUS[c.status][ar ? 1 : 0]}</span></div>
                <h3>{ar ? c.ar : c.en}</h3>
                <p>{ar ? c.arText : c.enText}</p>
                {c.facts && <ul>{c.facts.map(([en, a]) => <li key={en} dir="auto">{ar ? a : en}</li>)}</ul>}
                {c.roles && <div className="ws-roles">{ROLES.map(([en, a]) => <span key={en}>{ar ? a : en}</span>)}</div>}
                {c.link && (c.link.to
                  ? <Link className="ws-link" to={c.link.to}>{ar ? c.link.ar : c.link.en}<ArrowRight size={13} /></Link>
                  : <a className="ws-link" href={c.link.href} target="_blank" rel="noreferrer">{ar ? c.link.ar : c.link.en}<ArrowUpRight size={13} /></a>)}
              </article>
            ))}
          </div>
          {g.en === 'Integration' && <ScfhsPending compact />}
        </section>
      ))}

      <section className="bpr-panel">
        <div className="bpr-panel-head"><h2><ClipboardList size={18} />{ar ? 'سجل منشأ الذكاء الاصطناعي — فُحص الآن' : 'AI provenance ledger — checked now'}</h2>{ai && <SourceBadge source={ai.source} />}</div>
        <p className="bpr-note">{ar
          ? 'تعرض هذه الصفحة رؤوس سلاسل منشأ موقّعة وتتحقق من التوقيع على جهازك. لا تعرض النص السريري ولا تثبت أن مساعدًا سريريًا متصل بهذا العرض.'
          : 'This page displays signed provenance chain heads and verifies their signatures on your device. It contains no clinical text and does not prove a clinical assistant is connected to this workspace.'}</p>
        {aiErr && <CheckRow label={ar ? 'رؤوس السلاسل' : 'Chain heads'} check={{ state: 'unavailable', detail: 'registry unreachable' }} />}
        {!ai && !aiErr && <CheckRow label={ar ? 'رؤوس السلاسل' : 'Chain heads'} check={{ state: 'pending' }} />}
        {ai?.heads.map((h) => (
          <CheckRow key={h.instance} label={`${h.instance} · ${ar ? 'سجل طبي' : 'EMR'}`} check={h.check}>
            <code className="bpr-hash" dir="ltr">{h.size} {ar ? 'ملاحظة' : 'notes'} · {short(h.hash, 10)}{h.size === 0 ? (ar ? ' · بداية السلسلة' : ' · genesis') : ''}</code>
          </CheckRow>
        ))}
      </section>
    </BprLayout>
  );
}
