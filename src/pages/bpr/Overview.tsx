import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, LayoutGrid, ArrowRight, ArrowUpRight, BadgeCheck, Braces, BookOpenCheck, Calculator, Check, FlaskConical, Fingerprint, GraduationCap, HeartHandshake, Hourglass, KeyRound, Link2, Network, Search, Server, ShieldCheck, Shuffle, Stethoscope, Users, UsersRound } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, CheckRow, SourceBadge, valueLabel, WorkspaceBand } from '../../components/BprKit';
import { checkCredential, CredentialResult, LedgerResult, ProviderList, REGISTRY, replayLedger, short, useLoad } from '../../lib/bpr';
import { countTools } from '../../utils/arabicCount';

const SPID = 'SA-PHY-000003';

type ModuleStatus = 'live' | 'awaiting' | 'planned';
const STATUS_LABEL: Record<ModuleStatus, [string, string]> = {
  live: ['Live today', 'يعمل اليوم'],
  awaiting: ['Ongoing integration', 'تكامل جارٍ'],
  planned: ['Coming next', 'قادمًا'],
};
const TIER_ORDER: ModuleStatus[] = ['live', 'awaiting', 'planned'];

// Every module below runs today on registry.brainsait.de. "here" = rebuilt as a page on this site;
// members-only tools stay on the registry, behind its sign-in.
const MODULES = [
  { icon: LayoutGrid, to: '/bpr/workspace', status: 'live' as ModuleStatus, en: 'Provider workspace', ar: 'مساحة عمل مقدم الرعاية', tag: 'OpenEMR · Copilot · Arabic voice',
    enText: 'Own EMR, a clinical copilot with Arabic dictation, FHIR, specialty tools and research — each feature marked live, ongoing or planned.', arText: 'سجل طبي خاص ومساعد سريري بإملاء عربي وFHIR وأدوات التخصص والبحث — مع بيان ما يعمل وما هو جارٍ وما هو قادم لكل ميزة.' },
  { icon: KeyRound, to: '/bpr/verify', status: 'live' as ModuleStatus, en: 'Signed credentials', ar: 'شهادات موقّعة', tag: 'W3C VC 2.0 · Ed25519',
    enText: 'Check a registry-signed credential on your own device — no account, nothing uploaded.', arText: 'تحقق من شهادة موقّعة من السجل على جهازك — دون حساب ودون رفع أي شيء.' },
  { icon: Link2, to: '/bpr/ledger', status: 'live' as ModuleStatus, en: 'Transparency log', ar: 'السجل الشفاف', tag: 'Append-only · signed head',
    enText: 'Every issue, renewal and revocation is a line in a public hash chain your browser replays.', arText: 'كل إصدار وتجديد وإلغاء سطر في سلسلة تجزئة عامة يعيد متصفحك التحقق منها.' },
  { icon: Fingerprint, to: '/bpr/providers', status: 'live' as ModuleStatus, en: 'Provider directory', ar: 'دليل مقدمي الرعاية', tag: 'SPID · OID 1.3.6.1.4.1.61026',
    enText: 'Permanent provider IDs with every trust dimension shown separately — never blended into one badge.', arText: 'معرّفات دائمة لمقدمي الرعاية مع عرض كل بُعد للثقة بشكل منفصل — دون دمجها في شارة واحدة.' },
  { icon: FlaskConical, to: '/bpr/research', status: 'live' as ModuleStatus, en: 'Research footprint', ar: 'البصمة البحثية', tag: 'ORCID × Zenodo × Hugging Face',
    enText: 'Works matched by DOI across three sources; counted only when the publisher names the ORCID iD.', arText: 'أعمال مطابقة عبر DOI من ثلاثة مصادر؛ تُحتسب فقط عندما يذكر الناشر معرّف ORCID.' },
  { icon: Braces, to: '/bpr/developers', status: 'live' as ModuleStatus, en: 'FHIR R4 & public API', ar: 'FHIR R4 والواجهة العامة', tag: 'Interoperability',
    enText: 'Practitioner, PractitionerRole and Organization resources, plus a JSON API — public fields only.', arText: 'موارد Practitioner وPractitionerRole وOrganization وواجهة JSON — بيانات عامة فقط.' },
  { icon: CalendarClock, to: '/slots', status: 'planned' as ModuleStatus, en: 'Hospital slots marketplace', ar: 'سوق شواغر المستشفيات', tag: 'Launching soon',
    enText: 'Hospitals publish openings with fees up front; providers request them with their SPID. Launching soon — get your profile ready.', arText: 'تنشر المستشفيات فرصها مع الرسوم معلنة، ويطلبها مقدمو الرعاية بمعرّف SPID. ينطلق قريبًا — جهّز ملفك الآن.' },
  { icon: Users, to: '/bpr/join', status: 'live' as ModuleStatus, en: 'Onboarding', ar: 'الانضمام', tag: 'One question per slide',
    enText: 'Arabic-first wizard, ORCID sign-in and reviewed documents that become verified qualifications.', arText: 'معالج عربي أولاً وتسجيل دخول عبر ORCID ومستندات تُراجع لتصبح مؤهلات موثّقة.' },
  { icon: Calculator, href: `${REGISTRY}/tools.php`, status: 'live' as ModuleStatus, en: 'Specialty toolkit', ar: 'أدوات التخصص', tag: 'Members',
    enText: 'Checklists, templates and clinical calculators matched to the specialty. Members only, on the registry.', arText: 'قوائم تحقق وقوالب وحاسبات سريرية حسب التخصص. للأعضاء فقط، على السجل.' },
  { icon: Server, to: '/bpr/workspace', status: 'live' as ModuleStatus, en: 'Private clinical workspace', ar: 'مساحة سريرية خاصة', tag: 'Members · OpenEMR',
    enText: 'A provisioned OpenEMR workspace per provider, with a separate subdomain, database and TLS. Access is for members; a public demo with synthetic patients runs at demo.emr.brainsait.de.', arText: 'مساحة OpenEMR مخصصة لكل مقدم رعاية بنطاق فرعي وقاعدة بيانات وشهادة TLS مستقلة. الوصول للأعضاء، وتتوفر نسخة تجريبية عامة ببيانات مصطنعة على demo.emr.brainsait.de.' },
  { icon: Network, to: null as unknown as string, status: 'awaiting' as ModuleStatus, en: 'NPHIES integration', ar: 'التكامل مع نفيس', tag: 'Eligibility · claims · pre-authorisation',
    enText: 'NPHIES eligibility, pre-authorisation and claims from the workspace — integration is ongoing.', arText: 'الأهلية والموافقات المسبقة والمطالبات من مساحة العمل من خلال تكامل نفيس — والتكامل جارٍ.' },
  { icon: BookOpenCheck, to: null as unknown as string, status: 'awaiting' as ModuleStatus, en: 'SCFHS credential check', ar: 'التحقق من اعتماد الهيئة', tag: 'Licence · qualifications',
    enText: 'Licence and qualifications read directly from the Saudi Commission for Health Specialties. Integration is ongoing; until it goes live they show as “not assessed”.', arText: 'قراءة الترخيص والمؤهلات مباشرة من الهيئة السعودية للتخصصات الصحية. التكامل جارٍ، وإلى أن يكتمل تظهر «لم تُقيَّم».' },
  { icon: HeartHandshake, to: null as unknown as string, status: 'planned' as ModuleStatus, en: 'Peer-to-peer review', ar: 'مراجعة الأقران', tag: 'Case & note review',
    enText: 'Structured case and note reviews between providers, recorded against each provider’s BPR identity.', arText: 'مراجعات منظمة للحالات والملاحظات بين مقدمي الرعاية، تُسجَّل على هوية BPR لكل منهم.' },
  { icon: UsersRound, to: null as unknown as string, status: 'planned' as ModuleStatus, en: 'Your care team', ar: 'فريق الرعاية الخاص بك', tag: 'Roles · access',
    enText: 'Onboard nurses, therapists, receptionists and more — each with their own role and access.', arText: 'أضف ممرضين وأخصائيين وموظفين إلى مساحة عملك، لكل منهم دوره وصلاحياته.' },
  { icon: GraduationCap, to: null as unknown as string, status: 'planned' as ModuleStatus, en: 'Mentoring & training', ar: 'الإرشاد والتدريب', tag: 'Rotations · teaching',
    enText: 'Mentor colleagues and run training sessions using the same tools, calculators and cases.', arText: 'أرشد الزملاء وأدر جلسات تدريبية باستخدام الأدوات والحاسبات والحالات نفسها.' },
  { icon: Shuffle, to: null as unknown as string, status: 'planned' as ModuleStatus, en: 'Shift matching', ar: 'تغطية المناوبات والمطابقة الذكية', tag: 'Slots · rotations',
    enText: 'Publish a shift you need covered and match it automatically to a suitable provider profile.', arText: 'انشر مناوبة تحتاج إلى تغطيتها وطابقها تلقائيًا مع ملف مقدم الرعاية المناسب.' },
];

export default function Overview() {
  const { ar } = useI18n();
  const nav = useNavigate();
  const [spid, setSpid] = useState(SPID);
  const list = useLoad<ProviderList>('/api/providers', 'providers.json');
  const [cred, setCred] = useState<CredentialResult | null>(null);
  const [ledger, setLedger] = useState<LedgerResult | null>(null);
  const [credErr, setCredErr] = useState(false);
  const [ledgerErr, setLedgerErr] = useState(false);
  useEffect(() => { checkCredential(SPID).then(setCred, () => setCredErr(true)); replayLedger().then(setLedger, () => setLedgerErr(true)); }, []);
  const NA = { state: 'unavailable' as const, detail: ar ? 'تعذّر الوصول إلى السجل' : 'registry unreachable' };
  const pending = { state: 'pending' as const };
  usePageMeta({
    title: ar ? 'BPR — سجل برينسايت لمقدمي الرعاية' : 'BPR — BrainSAIT Provider Registry',
    description: ar ? 'هوية موقّعة لكل ممارس صحي: دليل، تحقق على الجهاز، سجل شفاف، بصمة بحثية وFHIR R4.' : 'Signed identity for every clinician: directory, on-device verification, transparency log, research footprint and FHIR R4.',
    url: '/bpr', type: 'website',
  });
  const go = (e: FormEvent) => { e.preventDefault(); const id = spid.trim().toUpperCase(); if (id) nav(`/bpr/verify?spid=${encodeURIComponent(id)}`); };
  const items = list.state === 'ready' ? list.data.items : [];
  const linked = items.filter((p) => p.trust.identity === 'confirmed').length;
  const signed = items.filter((p) => p.trust.signature === 'current').length;

  return (
    <BprLayout
      kicker="BrainSAIT Provider Registry"
      title={ar ? 'هوية مهنية واحدة موثوقة، يتحقق منها أي شخص.' : 'One trusted identity. Anyone can check it.'}
      lead={ar
        ? 'يمنح BPR كل ممارس صحي معرّفًا دائمًا واعتمادًا موقّعًا رقميًا يتحقق منه أي مستشفى أو جهة دافعة أو مريض في ثوانٍ، من أي هاتف، دون حساب. لا تثق بكلامنا — هذه الصفحة تتحقق بنفسها أمامك.'
        : 'BPR gives every healthcare professional a permanent ID and a digitally signed credential any hospital, payer or patient can check in seconds — on any phone, no account needed. Don’t take our word for it: this page verifies itself, live, in front of you.'}
      actions={<>
        <Link className="profile-button primary" to="/bpr/providers">{ar ? 'تصفح الدليل' : 'Browse the directory'}<ArrowRight size={16} /></Link>
        <a className="profile-button secondary" href="https://calendar.app.google/rAqiE6pNumtECdnd7" target="_blank" rel="noreferrer">{ar ? 'احجز عرضًا توضيحيًا مباشرًا' : 'Book a live demo'}<ArrowRight size={16} /></a>
        <Link className="profile-button secondary" to="/bpr/join">{ar ? 'انضم إلى BPR' : 'Join BPR'}<ArrowRight size={16} /></Link>
      </>}
    >
      <WorkspaceBand />

      <section className="bpr-live-strip" aria-label={ar ? 'مؤشرات مباشرة' : 'Live indicators'}>
        <div><span>{ar ? 'مقدمو رعاية مدرجون' : 'Listed providers'}</span><strong>{list.state === 'ready' ? items.length : '…'}</strong>{list.state === 'ready' && <SourceBadge source={list.source} />}</div>
        <div><span>{ar ? 'ORCID مؤكد' : 'ORCID confirmed'}</span><strong>{list.state === 'ready' ? linked : '…'}</strong><small>{ar ? 'من الدليل' : 'from the directory'}</small></div>
        <div><span>{ar ? 'شهادات موقّعة سارية' : 'Current signed credentials'}</span><strong>{list.state === 'ready' ? signed : '…'}</strong><small>W3C VC · EdDSA</small></div>
        <div><span>{ar ? 'أسطر السجل الشفاف' : 'Ledger entries'}</span><strong>{ledger ? ledger.head.size : '…'}</strong>{ledger && <SourceBadge source={ledger.source} />}</div>
      </section>

      <section className="bpr-live-strip" aria-label={ar ? 'أدوات BPR حسب الحالة' : 'BPR tools by status'}>
        <div><span>{ar ? 'أدوات تعمل اليوم' : 'Tools live today'}</span><strong>{MODULES.filter((m) => m.status === 'live').length}</strong><small>{ar ? 'مباشرة على الموقع' : 'live on this site'}</small></div>
        <div><span>{ar ? 'تكامل جارٍ' : 'Ongoing integration'}</span><strong>{MODULES.filter((m) => m.status === 'awaiting').length}</strong><small>{ar ? 'يُبنى الآن' : 'being built'}</small></div>
        <div><span>{ar ? 'قادمًا' : 'Coming next'}</span><strong>{MODULES.filter((m) => m.status === 'planned').length}</strong><small>{ar ? 'في الخطة القادمة' : 'on the roadmap'}</small></div>
        <div><span>{ar ? 'إجمالي الأدوات' : 'Total tools'}</span><strong>{MODULES.length}</strong><small>{ar ? 'في أدوات BPR' : 'in the BPR toolkit'}</small></div>
      </section>

      <section className="bpr-split">
        <div className="bpr-pass">
          <div className="bpr-pass-head"><span>BPR / PROVIDER CREDENTIAL</span><BadgeCheck size={25} /></div>
          <div className="bpr-pass-person"><span className="bpr-monogram" aria-hidden="true">{(cred?.claims.credentialSubject.name || 'Mohamed El Fadil').replace(/^Dr\.?\s*/, '').split(/\s+/).filter((w) => /^[A-Z]/.test(w)).filter((w, i, a) => i === 0 || i === a.length - 1).map((w) => w[0]).join('') || 'EF'}</span><div><strong>{cred?.claims.credentialSubject.name || 'Dr. Mohamed El Fadil'}</strong><span>{cred?.claims.credentialSubject.nameAr || 'د. محمد الفاضل'}</span></div></div>
          <dl><div><dt>SPID</dt><dd>{SPID}</dd></div><div><dt>{ar ? 'صالحة حتى' : 'VALID UNTIL'}</dt><dd>{cred ? cred.claims.validUntil.slice(0, 10) : '…'}</dd></div><div><dt>ISSUER</dt><dd>did:web:registry.brainsait.de</dd></div></dl>
          <div className="bpr-pass-foot"><span><Check size={13} />Ed25519 · W3C VC</span><Fingerprint size={29} /></div>
        </div>
        <div className="bpr-panel">
          <h2>{ar ? 'فحص مباشر الآن' : 'Checked just now, in this tab'}</h2>
          <CheckRow label={ar ? 'توقيع الشهادة' : 'Credential signature'} check={cred?.signature || (credErr ? NA : pending)} />
          <CheckRow label={ar ? 'فترة الصلاحية' : 'Validity window'} check={cred?.expiry || (credErr ? NA : pending)} okText={ar ? 'سارية' : 'In date'} />
          <CheckRow label={ar ? 'الحالة المباشرة' : 'Live status'} check={cred?.status || (credErr ? NA : pending)} okText={valueLabel(cred?.status.value, ar)} />
          <CheckRow label={ar ? 'سلسلة التجزئة' : 'Hash chain replay'} check={ledger?.chain || (ledgerErr ? NA : pending)} />
          <CheckRow label={ar ? 'رأس السجل الموقّع' : 'Signed ledger head'} check={ledger?.headSignature || (ledgerErr ? NA : pending)}>
            {ledger && <code className="bpr-hash" dir="ltr">{short(ledger.head.hash, 14)}</code>}
          </CheckRow>
          <form className="bpr-inline-form" onSubmit={go}>
            <label className="sr-only" htmlFor="ov-spid">SPID</label>
            <input id="ov-spid" dir="ltr" value={spid} onChange={(e) => setSpid(e.target.value)} placeholder="SA-PHY-000003" />
            <button type="submit"><Search size={15} />{ar ? 'تحقق من معرّف' : 'Verify an SPID'}</button>
          </form>
        </div>
      </section>

      <section className="bpr-section">
        <div className="profile-section-label">01 · {ar ? 'أدوات BPR' : 'The BPR toolkit'}</div>
        <h2 className="bpr-h2">{ar ? 'كل أداة يحتاجها مقدم الرعاية، في مكان واحد.' : 'Every tool a provider needs, in one place.'}</h2>
        <p className="bpr-lead-note">{ar ? 'مرتّبة بوضوح: ما يعمل اليوم، وما يجري تكامله، وما هو قادم.' : 'Sorted plainly: what runs today, what is being integrated, and what comes next.'}</p>
        {TIER_ORDER.map((status) => {
          const tier = MODULES.filter((m) => m.status === status);
          if (!tier.length) return null;
          const [labelEn, labelAr] = STATUS_LABEL[status];
          return (
            <section key={status} className="bpr-tier">
              <div className="bpr-tier-head">
                <span className={`bpr-tier-badge ${status}`}>{ar ? labelAr : labelEn}</span>
                <span className="bpr-tier-count">{countTools(tier.length, ar)}</span>
              </div>
              <div className="bpr-module-grid">
                {tier.map(({ icon: Icon, ...m }) => {
                  const body = <>
                    <div className="bpr-module-top"><Icon size={24} /><span className={`bpr-chip ${status}`}>{ar ? labelAr : labelEn}</span></div>
                    <h3>{ar ? m.ar : m.en}</h3><p>{ar ? m.arText : m.enText}</p>
                    {m.to || m.href ? <strong>{status === 'planned' ? (ar ? 'اعرف المزيد' : 'Learn more') : (ar ? 'افتح' : 'Open')}{m.to ? <ArrowRight size={14} /> : <ArrowUpRight size={14} />}</strong> : <strong className="bpr-chip-unavailable">{ar ? 'لا يزال يُبنى' : 'Being built'}</strong>}
                  </>;
                  if (m.to) return <Link key={m.en} to={m.to} className={`bpr-module ${status}`}>{body}</Link>;
                  if (m.href) return <a key={m.en} href={m.href} target="_blank" rel="noreferrer" className={`bpr-module members ${status}`}>{body}</a>;
                  return <div key={m.en} className={`bpr-module ${status} bpr-module-planned`}>{body}</div>;
                })}
              </div>
            </section>
          );
        })}
      </section>

      <section className="bpr-architecture">
        <div className="profile-section-label">02 · {ar ? 'كيف تتصل الأجزاء' : 'How it connects'}</div>
        <h2>{ar ? 'من الهوية إلى الدليل، دون فقدان الثقة.' : 'From identity to evidence, without losing trust.'}</h2>
        <div className="bpr-flow">
          <div><Stethoscope size={25} /><strong>{ar ? 'مقدم الرعاية' : 'Provider'}</strong><span>SPID · ORCID</span></div><i />
          <div><KeyRound size={25} /><strong>{ar ? 'شهادة موقعة' : 'Signed credential'}</strong><span>Ed25519 · did:web</span></div><i />
          <div><Network size={25} /><strong>{ar ? 'بيانات مترابطة' : 'Connected data'}</strong><span>FHIR R4 · Research</span></div><i />
          <div><ShieldCheck size={25} /><strong>{ar ? 'تحقق عام' : 'Public proof'}</strong><span>Status · Ledger</span></div>
        </div>
      </section>
    </BprLayout>
  );
}
