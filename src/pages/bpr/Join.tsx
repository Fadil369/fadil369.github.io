import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Calculator, FileCheck2, IdCard, KeyRound, LogIn, Server, UserPlus } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, ExtLink, WorkspaceBand } from '../../components/BprKit';
import { REGISTRY } from '../../lib/bpr';

// Joining writes personal data, so it stays on registry.brainsait.de (ORCID sign-in, CSRF-protected
// forms, private document storage). This page explains the path and hands over to it.
const STEPS = [
  { icon: LogIn, en: 'Sign in with ORCID', ar: 'سجّل الدخول عبر ORCID', enText: 'Your ORCID iD links you to the registry; ownership is confirmed by ORCID itself.', arText: 'يربطك معرّف ORCID بالسجل، وتؤكد ORCID ملكيته بنفسها.' },
  { icon: UserPlus, en: 'Answer one question per slide', ar: 'سؤال واحد في كل شريحة', enText: 'A bilingual, Arabic-first wizard collects your public profile.', arText: 'معالج ثنائي اللغة يبدأ بالعربية يجمع ملفك العام.' },
  { icon: FileCheck2, en: 'Submit credential documents', ar: 'قدّم مستندات الاعتماد', enText: 'Documents are submitted privately for review; a signature alone does not establish licensure.', arText: 'تُقدّم المستندات بصورة خاصة للمراجعة؛ ولا يثبت التوقيع وحده الترخيص المهني.' },
  { icon: KeyRound, en: 'Receive a signed credential', ar: 'استلم اعتمادًا موقّعًا', enText: 'When issued, a W3C credential can be checked against the public transparency chain.', arText: 'عند إصدار اعتماد W3C يمكن التحقق منه مقابل السجل الشفاف العام.' },
  { icon: IdCard, en: 'Profile, card and directory', ar: 'الملف والبطاقة والدليل', enText: 'Public profile, QR member card and a listing in the directory.', arText: 'ملف عام وبطاقة عضوية برمز QR وإدراج في الدليل.' },
];

export default function Join() {
  const { ar } = useI18n();
  usePageMeta({
    title: ar ? 'انضم إلى BPR' : 'Join BPR',
    description: ar ? 'كيف ينضم الممارس الصحي إلى سجل برينسايت: ORCID، المعالج، المستندات، والاعتماد الموقّع.' : 'How a clinician joins the BrainSAIT Provider Registry: ORCID, the wizard, documents and a signed credential.',
    url: '/bpr/join', type: 'website',
  });
  return (
    <BprLayout kicker={ar ? 'الانضمام' : 'Join'}
      title={ar ? 'تبدأ هويتك المهنية الموقّعة من ORCID.' : 'Your signed professional identity starts with ORCID.'}
      lead={ar
        ? 'يتم الانضمام عبر منصة السجل مباشرة، حيث تبقى بياناتك الشخصية ومستنداتك محمية. إليك ما يحدث خطوة بخطوة.'
        : 'Joining takes place on the registry itself, where your personal details and documents stay private. Here is what happens, step by step.'}
      actions={<>
        <a className="profile-button primary" href={`${REGISTRY}/join.php`} target="_blank" rel="noreferrer">{ar ? 'ابدأ الانضمام على السجل (نافذة جديدة)' : 'Start joining on the registry (new tab)'}<ArrowUpRight size={16} /></a>
        <a className="profile-button secondary" href={`${REGISTRY}/scfhs.php`} target="_blank" rel="noreferrer">{ar ? 'دليل تصنيف الهيئة' : 'SCFHS classification guide'}<ArrowUpRight size={16} /></a>
      </>}>
      <ol className="bpr-steps">
        {STEPS.map(({ icon: Icon, ...s }, i) => (
          <li key={s.en}><span>{String(i + 1).padStart(2, '0')}</span><Icon size={22} /><div><h3>{ar ? s.ar : s.en}</h3><p>{ar ? s.arText : s.enText}</p></div></li>
        ))}
      </ol>
      <section className="bpr-panel">
        <h2>{ar ? 'قبل أن تبدأ' : 'Before you start'}</h2>
        <p>{ar ? 'ستحتاج إلى تسجيل الدخول عبر ORCID وإعداد مستندات الاعتماد للمراجعة. يجمع معالج السجل بيانات ملفك العام؛ وتُقدّم المستندات بصورة خاصة. راجع تفاصيل الخصوصية والبيانات المطلوبة على السجل قبل الإرسال.' : 'You will need an ORCID sign-in and credential documents for review. The registry wizard collects your public profile; documents are submitted privately. Review the registry’s privacy information and requested fields before submitting.'}</p>
        <p className="bpr-note">{ar ? 'مدة المراجعة غير محددة هنا، ولا يضمن تقديم الطلب إصدار اعتماد.' : 'Review timing is not specified here, and submitting an application does not guarantee a credential.'}</p>
      </section>
      <WorkspaceBand />
      <section className="bpr-section">
        <div className="profile-section-label">{ar ? 'للأعضاء' : 'For members'}</div>
        <div className="bpr-module-grid two">
          <a className="bpr-module members" href={`${REGISTRY}/tools.php`} target="_blank" rel="noreferrer">
            <div className="bpr-module-top"><Calculator size={24} /><small>{ar ? 'للأعضاء' : 'Members'}</small></div>
            <h3>{ar ? 'أدوات التخصص' : 'Specialty toolkit'}</h3>
            <p>{ar ? 'قوائم تحقق وقوالب وحاسبات سريرية — مرجع يُراجع مقابل البروتوكول المحلي.' : 'Checklists, templates and clinical calculators — reference aids, checked against local protocol.'}</p>
            <strong>{ar ? 'على السجل' : 'On the registry'}<ArrowUpRight size={14} /></strong>
          </a>
          <Link className="bpr-module members" to="/bpr/workspace">
            <div className="bpr-module-top"><Server size={24} /><small>OpenEMR · {ar ? 'عرض تجريبي' : 'Demo'}</small></div>
            <h3>{ar ? 'عرض مساحة العمل' : 'Workspace demo'}</h3>
            <p>{ar ? 'يتوفر عرض ببيانات مصطنعة. لم يتم التحقق من تجهيز مساحة للأعضاء بعد الانضمام.' : 'A synthetic-data demo is available. Member provisioning after joining has not been verified here.'}</p>
            <strong>{ar ? 'استكشف المساحة' : 'Explore the workspace'}<ArrowRight size={14} /></strong>
          </Link>
        </div>
      </section>
      <p className="bpr-note"><ExtLink href={`${REGISTRY}/knowledge.php`}>{ar ? 'مركز المعرفة (بحث الأدوية)' : 'Knowledge hub (drug lookup)'}</ExtLink></p>
    </BprLayout>
  );
}
