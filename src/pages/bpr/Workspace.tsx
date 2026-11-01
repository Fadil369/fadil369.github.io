import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, BookOpenCheck, Bot, Calculator, CalendarClock, ClipboardList, FlaskConical, GraduationCap,
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
      { icon: Server, status: 'live', en: 'Your own customised OpenEMR', ar: 'OpenEMR خاص ومخصص لك',
        enText: 'An isolated OpenEMR 7 for each provider — own subdomain, own database, own TLS, encrypted offsite backups — showing your name, in the BrainSAIT theme with accessible contrast. Provisioned from the registry.',
        arText: 'نسخة OpenEMR 7 معزولة لكل مقدم رعاية — نطاق فرعي وقاعدة بيانات وشهادة TLS خاصة ونسخ احتياطية مشفرة خارج الموقع — باسمك وبهوية برينسايت وتباين ألوان مناسب. تُجهَّز من السجل.',
        facts: [['{spid}.emr.brainsait.de', '{spid}.emr.brainsait.de'], ['SMART-on-FHIR launch', 'إطلاق SMART-on-FHIR'], ['Copilot built in at /copilot', 'المساعد مدمج في /copilot']],
        link: { href: 'https://emr.brainsait.de/', en: 'EMR portal', ar: 'بوابة السجل الطبي' } },
      { icon: Bot, status: 'live', en: 'BrainSAIT Copilot', ar: 'مساعد برينسايت',
        enText: 'A built-in clinical assistant with 14 bilingual skills, running by default on models hosted on BrainSAIT’s own server, so patient data stays on that server. It drafts; the clinician reviews, edits and saves.',
        arText: 'مساعد سريري مدمج بـ14 مهارة ثنائية اللغة، يعمل افتراضيًا على نماذج مستضافة على خادم برينسايت، فتبقى بيانات المرضى على ذلك الخادم. يقدّم مسودات؛ والطبيب يراجع ويعدّل ويحفظ.',
        facts: [['14 skills — full list above', '14 مهارة — القائمة الكاملة أعلاه'], ['Pre-visit briefs from your appointments', 'ملخصات ما قبل الزيارة من مواعيدك'], ['Each EMR keeps its own encrypted cache and provenance chain', 'لكل سجل طبي ذاكرة مشفرة وسلسلة منشأ خاصة']] },
      { icon: Mic, status: 'live', en: 'Arabic voice-to-text', ar: 'تحويل الصوت العربي إلى نص',
        enText: 'Dictate in Arabic or English: on-premise speech recognition turns it into a SOAP draft, or dictates into any field. A fidelity guard flags any drug or dose that was not in the dictation or the chart.',
        arText: 'أملِ بالعربية أو الإنجليزية: يحوّل التعرف على الكلام المحلي حديثك إلى مسودة SOAP أو يكتب في أي حقل. ويُنبّه حارس الدقة إلى أي دواء أو جرعة لم ترد في الإملاء أو الملف.',
        facts: [['Whisper large-v3-turbo, on-premise', 'Whisper large-v3-turbo محليًا'], ['Ambient scribe → SOAP', 'كاتب تلقائي ← SOAP']] },
      { icon: ShieldAlert, status: 'live', en: 'Sentinel safety rules', ar: 'قواعد السلامة Sentinel',
        enText: '16 deterministic checks with the source shown — metformin and SGLT2i against eGFR, hyperkalaemia on RAAS blockade, NSAID “triple whammy”, allergy cross-reactivity, BP / HbA1c / LDL targets, overdue monitoring.',
        arText: '16 فحصًا حتميًا مع ذكر المصدر — الميتفورمين ومثبطات SGLT2 مقابل eGFR، وفرط البوتاسيوم مع حاصرات RAAS، و«الضربة الثلاثية» لمضادات الالتهاب، وتفاعل الحساسية، وأهداف الضغط وHbA1c وLDL، والمتابعة المتأخرة.' },
    ],
  },
  {
    en: 'Integration', ar: 'التكامل', caps: [
      { icon: Layers, status: 'live', en: 'FHIR R4', ar: 'FHIR R4',
        enText: 'Providers published as FHIR Practitioner / PractitionerRole / Organization, and the EMR speaks FHIR to the Copilot through a SMART launch.',
        arText: 'مقدمو الرعاية منشورون كموارد FHIR Practitioner وPractitionerRole وOrganization، ويتواصل السجل الطبي مع المساعد عبر FHIR بإطلاق SMART.',
        link: { to: '/bpr/developers', en: 'FHIR & API', ar: 'FHIR والواجهات' } },
      { icon: Network, status: 'awaiting', en: 'NPHIES integration', ar: 'التكامل مع نفيس',
        enText: 'Eligibility, pre-authorisation and claims straight from the workspace — integration is ongoing.',
        arText: 'الأهلية والموافقات المسبقة والمطالبات مباشرة من مساحة العمل — والتكامل جارٍ.' },
      { icon: BookOpenCheck, status: 'awaiting', en: 'SCFHS credential check', ar: 'التحقق من اعتماد الهيئة',
        enText: 'Licence and qualifications read directly from the Saudi Commission for Health Specialties. Integration is ongoing; until it goes live they show as “not assessed”.',
        arText: 'قراءة الترخيص والمؤهلات مباشرة من الهيئة السعودية للتخصصات الصحية. التكامل جارٍ، وإلى أن يكتمل تظهر «لم تُقيَّم».' },
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
      { icon: CalendarClock, status: 'planned', en: 'Open slots', ar: 'الفترات المتاحة',
        enText: 'Publish a slot you need covered, or pick up any open slot that matches your verified profile.',
        arText: 'انشر فترة تحتاج إلى تغطيتها، أو التقط أي فترة متاحة تناسب ملفك.' },
      { icon: Shuffle, status: 'planned', en: 'Matching', ar: 'المطابقة',
        enText: 'Match providers to slots and teams — and doctors in training to mentors and rotations.',
        arText: 'مطابقة مقدمي الرعاية مع الفترات والفرق — والأطباء المتدربين مع المرشدين والتدويرات.' },
    ],
  },
];

// What every provider gets — one row per capability, in the order the owner listed them.
const CHECKLIST: { status: Status; en: string; ar: string; enText: string; arText: string; to?: string; href?: string }[] = [
  { status: 'live', en: 'A complete, intelligent workspace', ar: 'مساحة عمل ذكية متكاملة', enText: 'One BPR identity opens everything below.', arText: 'هوية BPR واحدة تفتح كل ما يلي.', to: '/bpr/p/SA-PHY-000003' },
  { status: 'live', en: 'Your own customised OpenEMR', ar: 'OpenEMR خاص ومخصص لك', enText: 'Isolated instance with your name, BrainSAIT theme, own database, TLS and backups.', arText: 'نسخة معزولة باسمك وبهوية برينسايت، بقاعدة بيانات وشهادة ونسخ احتياطية خاصة.', href: 'https://emr.brainsait.de/' },
  { status: 'live', en: 'Built-in Copilot assistant', ar: 'مساعد سريري مدمج', enText: '14 bilingual skills inside your EMR, on BrainSAIT-hosted models by default; drafts only, you save.', arText: '14 مهارة ثنائية اللغة داخل سجلك الطبي، على نماذج مستضافة لدى برينسايت افتراضيًا؛ مسودات فقط والحفظ لك.' },
  { status: 'live', en: 'Arabic voice-to-text', ar: 'تحويل الصوت العربي إلى نص', enText: 'On-premise speech recognition, Arabic validated: dictation → SOAP draft or into any field.', arText: 'تعرّف محلي على الكلام مُختبَر بالعربية: إملاء ← مسودة SOAP أو في أي حقل.' },
  { status: 'live', en: 'FHIR integration', ar: 'التكامل عبر FHIR', enText: 'FHIR R4 registry API and SMART-on-FHIR launch inside the EMR.', arText: 'واجهة FHIR R4 للسجل وإطلاق SMART-on-FHIR داخل السجل الطبي.', to: '/bpr/developers' },
  { status: 'awaiting', en: 'NPHIES integration', ar: 'التكامل مع نفيس', enText: 'Eligibility, pre-authorisation and claims from the workspace — integration ongoing.', arText: 'الأهلية والموافقات المسبقة والمطالبات من مساحة العمل — والتكامل جارٍ.' },
  { status: 'live', en: 'Research page integration', ar: 'التكامل مع صفحة البحث', enText: 'DOI-matched works from ORCID, Zenodo and Hugging Face on your profile.', arText: 'أعمالك المطابقة عبر DOI من ORCID وZenodo وHugging Face في ملفك.', to: '/bpr/research/SA-PHY-000003' },
  { status: 'live', en: 'Calculators, forms & clinical tools', ar: 'الحاسبات والنماذج والأدوات السريرية', enText: 'Specialty kits with calculators, checklists, pre-filled forms and templates, printable with a verification QR.', arText: 'حزم تخصصية بحاسبات وقوائم تحقق ونماذج وقوالب معبأة، قابلة للطباعة مع رمز تحقق.', href: `${REGISTRY}/tools.php` },
  { status: 'awaiting', en: 'SCFHS credential check', ar: 'التحقق من اعتماد الهيئة', enText: 'Licence and qualifications read directly from SCFHS — integration ongoing.', arText: 'قراءة الترخيص والمؤهلات مباشرة من الهيئة — والتكامل جارٍ.' },
  { status: 'planned', en: 'Peer-to-peer review', ar: 'مراجعة الأقران', enText: 'Structured case and note review between providers.', arText: 'مراجعة منظمة للحالات والملاحظات بين مقدمي الرعاية.' },
  { status: 'planned', en: 'Choose or onboard your team', ar: 'اختيار فريقك أو ضمّه', enText: 'Nurses, respiratory therapists, receptionists and more — each with a role and access.', arText: 'ممرضون وأخصائيو علاج تنفسي وموظفو استقبال وغيرهم — لكل دوره وصلاحياته.' },
  { status: 'planned', en: 'Mentoring & training sessions', ar: 'الإرشاد وجلسات التدريب', enText: 'Teach with the same tools, calculators and cases.', arText: 'التدريب بالأدوات والحاسبات والحالات نفسها.' },
  { status: 'planned', en: 'Submit or pick up open slots', ar: 'نشر الفترات المتاحة أو العمل عليها', enText: 'Post a slot you need covered, or work any open slot that fits your profile.', arText: 'انشر فترة تحتاج تغطيتها، أو اعمل على أي فترة تناسب ملفك.' },
  { status: 'planned', en: 'Matching for providers & trainees', ar: 'المطابقة لمقدمي الرعاية والمتدربين', enText: 'Providers to slots and teams; doctors in training to mentors and rotations.', arText: 'مقدمو الرعاية مع الفترات والفرق؛ والأطباء المتدربون مع المرشدين والتدويرات.' },
];

const DAY: { status: Status; en: string; ar: string; enText: string; arText: string }[] = [
  { status: 'live', en: 'Before the visit', ar: 'قبل الزيارة', enText: 'The Copilot reads today’s and the next two days’ appointments and prepares a bilingual pre-visit brief while the model is idle.', arText: 'يقرأ المساعد مواعيد اليوم واليومين التاليين ويجهّز ملخصًا ثنائي اللغة قبل الزيارة أثناء خمول النموذج.' },
  { status: 'live', en: 'During the visit', ar: 'أثناء الزيارة', enText: 'Dictate in Arabic or English → SOAP draft. Sentinel checks medications against labs and allergies, with the source shown.', arText: 'أملِ بالعربية أو الإنجليزية ← مسودة SOAP. ويفحص Sentinel الأدوية مقابل التحاليل والحساسية مع ذكر المصدر.' },
  { status: 'live', en: 'After the visit', ar: 'بعد الزيارة', enText: 'Review, edit and save to your OpenEMR. The save is chained in the signed AI provenance ledger; data stays available over FHIR.', arText: 'راجع وعدّل واحفظ في OpenEMR. يُسجَّل الحفظ في سجل منشأ الذكاء الاصطناعي الموقّع؛ وتبقى البيانات متاحة عبر FHIR.' },
  { status: 'planned', en: 'Grow', ar: 'النمو', enText: 'Your research page updates itself; peer review, mentoring, team and open slots are next on the roadmap.', arText: 'تتحدث صفحة بحثك تلقائيًا؛ ومراجعة الأقران والإرشاد والفريق والفترات المتاحة هي التالية في الخطة.' },
];

const SKILLS: { en: string; ar: string; items: [string, string][] }[] = [
  { en: 'Voice', ar: 'الصوت', items: [['Ambient scribe → SOAP', 'كاتب تلقائي ← SOAP'], ['Dictate into any field', 'الإملاء في أي حقل']] },
  { en: 'Files', ar: 'الملفات', items: [['12-month timeline', 'خط زمني لـ12 شهرًا'], ['Classify documents', 'تصنيف المستندات']] },
  { en: 'Labs', ar: 'المختبر', items: [['Extract to FHIR Observation', 'استخراج إلى FHIR Observation'], ['Trends & deltas', 'الاتجاهات والفروق']] },
  { en: 'Radiology', ar: 'الأشعة', items: [['Structure the report', 'هيكلة التقرير'], ['Image assist (review required)', 'مساعدة بالصور (تتطلب مراجعة)']] },
  { en: 'Medications', ar: 'الأدوية', items: [['Reconcile home vs active', 'مطابقة المنزلية والحالية'], ['Safety (Sentinel rules)', 'السلامة (قواعد Sentinel)']] },
  { en: 'Diagnosis', ar: 'التشخيص', items: [['ICD-10-CM suggestions', 'اقتراحات ICD-10-CM'], ['Care gaps', 'فجوات الرعاية']] },
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
    description: ar ? 'لكل مقدم رعاية مساحة عمل ذكية: OpenEMR خاص، مساعد سريري، إملاء صوتي عربي، FHIR، أدوات التخصص والبحث.' : 'Every provider gets an intelligent workspace: own OpenEMR, clinical copilot, Arabic voice dictation, FHIR, specialty tools and research.',
    url: '/bpr/workspace', type: 'website',
  });
  const counts = GROUPS.flatMap((g) => g.caps).reduce((a, c) => ({ ...a, [c.status]: (a[c.status] || 0) + 1 }), {} as Record<Status, number>);

  return (
    <BprLayout kicker={ar ? 'مساحة العمل' : 'Provider workspace'}
      title={ar ? 'مساحة عمل ذكية متكاملة لكل ممارس صحي.' : 'Every healthcare professional gets a complete, intelligent workspace.'}
      lead={ar
        ? 'تفتحها هويتك في BPR: نظام سجلات طبية خاص بك، ومساعد سريري يفهم العربية ويكتب ملاحظاتك من صوتك، وتكامل وفق المعايير، وأدوات تخصصية جاهزة. والمزيد في الطريق: فريقك، ومراجعة الأقران، والفترات المتاحة.'
        : 'Your BPR identity opens it: your own medical record system, a clinical assistant that understands Arabic and writes your notes from your voice, standards-based integration and ready-made specialty tools. More is on the way: your team, peer review and open slots.'}
      actions={<>
        <Link className="profile-button primary" to="/bpr/join">{ar ? 'انضم واحصل على مساحتك' : 'Join and get your workspace'}<ArrowRight size={16} /></Link>
        <a className="profile-button secondary" href="https://emr.brainsait.de/" target="_blank" rel="noreferrer">{ar ? 'بوابة السجل الطبي' : 'EMR portal'}<ArrowUpRight size={16} /></a>
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
        <div className="profile-section-label">{ar ? 'مهارات المساعد المدمجة · 14' : 'Copilot built-in skills · 14'}</div>
        <div className="ws-skills">
          {SKILLS.map((g) => (
            <div key={g.en}><h3>{ar ? g.ar : g.en}</h3><ul>{g.items.map(([en, a]) => <li key={en}><Bot size={13} aria-hidden="true" />{ar ? a : en}</li>)}</ul></div>
          ))}
        </div>
        <p className="bpr-note">{ar ? 'كل المهارات ثنائية اللغة وتقدّم مسودات فقط؛ لا شيء يُحفظ أو يُفوتر دون إجراء من الطبيب. هي مهارات مدمجة على نماذج محلية، وليست نموذجًا مدرّبًا على بياناتك.' : 'Every skill is bilingual and produces drafts only; nothing is saved or billed without a clinician action. These are built-in skills on local models — not a model trained on your data.'}</p>
      </section>

      <section className="ws-hero" aria-label={ar ? 'مخطط مساحة العمل' : 'Workspace map'}>
        <div className="ws-core"><Stethoscope size={28} /><strong>{ar ? 'مقدم الرعاية' : 'Provider'}</strong><code dir="ltr">SA-PHY-000003</code><small>{ar ? 'هوية BPR موقّعة' : 'Signed BPR identity'}</small></div>
        {[[Server, 'OpenEMR', 'OpenEMR', 'live'], [Bot, 'Copilot', 'المساعد', 'live'], [Mic, 'Arabic voice', 'الصوت العربي', 'live'], [Layers, 'FHIR R4', 'FHIR R4', 'live'], [Calculator, 'Tools', 'الأدوات', 'live'], [FlaskConical, 'Research', 'البحث', 'live'], [Network, 'NPHIES', 'نفيس', 'awaiting'], [UsersRound, 'Team', 'الفريق', 'planned'], [GraduationCap, 'Mentoring', 'الإرشاد', 'planned'], [CalendarClock, 'Slots', 'الفترات', 'planned']].map(([Icon, en, a, st], i) => {
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
          ? 'كل ملاحظة يحفظها الطبيب بمساعدة المساعد تُسجَّل في سلسلة تجزئة لكل سجل طبي (من وماذا ومتى ونسبة التعديل — دون نص سريري). رأس كل سلسلة موقّع بمفتاح السجل، ويُفحص التوقيع هنا على جهازك.'
          : 'Every Copilot-assisted note a clinician saves is chained per EMR (who, what, when, edit share — no clinical text). Each chain head is signed with the registry key; the signature is checked here, on your device.'}</p>
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
