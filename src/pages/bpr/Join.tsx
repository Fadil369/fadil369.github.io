import { ArrowUpRight, Calculator, FileCheck2, IdCard, KeyRound, LogIn, Server, UserPlus } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, ExtLink, WorkspaceBand } from '../../components/BprKit';
import { REGISTRY } from '../../lib/bpr';

// Joining writes personal data, so it stays on registry.brainsait.de (ORCID sign-in, CSRF-protected
// forms, private document storage). This page explains the path and hands over to it.
const STEPS = [
  { icon: LogIn, en: 'Sign in with ORCID', ar: 'سجّل الدخول عبر ORCID', enText: 'Your ORCID iD links you to the registry; ownership is confirmed by ORCID itself.', arText: 'يربطك معرّف ORCID بالسجل، وتؤكد ORCID ملكيته بنفسها.' },
  { icon: UserPlus, en: 'Answer one question per slide', ar: 'سؤال واحد في كل شريحة', enText: 'A bilingual, Arabic-first wizard collects your public profile.', arText: 'معالج ثنائي اللغة يبدأ بالعربية يجمع ملفك العام.' },
  { icon: FileCheck2, en: 'Upload credential documents', ar: 'ارفع مستندات الاعتماد', enText: 'Stored privately, reviewed by a person, and turned into verified qualifications.', arText: 'تُحفظ بشكل خاص وتُراجع يدويًا ثم تصبح مؤهلات موثّقة.' },
  { icon: KeyRound, en: 'Receive your signed credential', ar: 'استلم اعتمادك الموقّع', enText: 'A W3C credential anyone can verify, logged in the public transparency chain.', arText: 'اعتماد W3C يمكن لأي شخص التحقق منه، مسجّل في السلسلة الشفافة العامة.' },
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
        <a className="profile-button primary" href={`${REGISTRY}/join.php`} target="_blank" rel="noreferrer">{ar ? 'ابدأ الانضمام' : 'Start joining'}<ArrowUpRight size={16} /></a>
        <a className="profile-button secondary" href={`${REGISTRY}/scfhs.php`} target="_blank" rel="noreferrer">{ar ? 'دليل تصنيف الهيئة' : 'SCFHS classification guide'}<ArrowUpRight size={16} /></a>
      </>}>
      <ol className="bpr-steps">
        {STEPS.map(({ icon: Icon, ...s }, i) => (
          <li key={s.en}><span>{String(i + 1).padStart(2, '0')}</span><Icon size={22} /><div><h3>{ar ? s.ar : s.en}</h3><p>{ar ? s.arText : s.enText}</p></div></li>
        ))}
      </ol>
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
          <a className="bpr-module members" href="https://emr.brainsait.de/" target="_blank" rel="noreferrer">
            <div className="bpr-module-top"><Server size={24} /><small>OpenEMR</small></div>
            <h3>{ar ? 'سجل طبي شخصي' : 'Personal EMR'}</h3>
            <p>{ar ? 'نسخة OpenEMR معزولة لكل مقدم رعاية بنطاق فرعي وقاعدة بيانات خاصة.' : 'An isolated OpenEMR instance per provider, with its own subdomain and database.'}</p>
            <strong>{ar ? 'بوابة EMR' : 'EMR portal'}<ArrowUpRight size={14} /></strong>
          </a>
        </div>
      </section>
      <p className="bpr-note"><ExtLink href={`${REGISTRY}/knowledge.php`}>{ar ? 'مركز المعرفة (بحث الأدوية)' : 'Knowledge hub (drug lookup)'}</ExtLink></p>
    </BprLayout>
  );
}
