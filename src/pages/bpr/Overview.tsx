import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, ArrowUpRight, BadgeCheck, Braces, Calculator, Check, FlaskConical, Fingerprint, KeyRound, Link2, Network, Search, Server, ShieldCheck, Stethoscope, Users } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, CheckRow, SourceBadge, valueLabel } from '../../components/BprKit';
import { checkCredential, CredentialResult, LedgerResult, ProviderList, REGISTRY, replayLedger, short, useLoad } from '../../lib/bpr';

const SPID = 'SA-PHY-000003';

// Every module below runs today on registry.brainsait.de. "here" = rebuilt as a page on this site;
// members-only tools stay on the registry, behind its sign-in.
const MODULES = [
  { icon: KeyRound, to: '/bpr/verify', en: 'Signed credentials', ar: 'شهادات موقّعة', tag: 'W3C VC 2.0 · Ed25519',
    enText: 'Check a registry-signed credential on your own device — no account, nothing uploaded.', arText: 'تحقق من شهادة موقّعة من السجل على جهازك — دون حساب ودون رفع أي شيء.' },
  { icon: Link2, to: '/bpr/ledger', en: 'Transparency log', ar: 'السجل الشفاف', tag: 'Append-only · signed head',
    enText: 'Every issue, renewal and revocation is a line in a public hash chain your browser replays.', arText: 'كل إصدار وتجديد وإلغاء سطر في سلسلة تجزئة عامة يعيد متصفحك التحقق منها.' },
  { icon: Fingerprint, to: '/bpr/providers', en: 'Provider directory', ar: 'دليل مقدمي الرعاية', tag: 'SPID · OID 1.3.6.1.4.1.61026',
    enText: 'Permanent provider IDs with every trust dimension shown separately — never blended into one badge.', arText: 'معرّفات دائمة لمقدمي الرعاية مع عرض كل بُعد للثقة بشكل منفصل — دون دمجها في شارة واحدة.' },
  { icon: FlaskConical, to: '/bpr/research', en: 'Research footprint', ar: 'البصمة البحثية', tag: 'ORCID × Zenodo × Hugging Face',
    enText: 'Works matched by DOI across three sources; counted only when the publisher names the ORCID iD.', arText: 'أعمال مطابقة عبر DOI من ثلاثة مصادر؛ تُحتسب فقط عندما يذكر الناشر معرّف ORCID.' },
  { icon: Braces, to: '/bpr/developers', en: 'FHIR R4 & public API', ar: 'FHIR R4 والواجهة العامة', tag: 'Interoperability',
    enText: 'Practitioner, PractitionerRole and Organization resources, plus a JSON API — public fields only.', arText: 'موارد Practitioner وPractitionerRole وOrganization وواجهة JSON — بيانات عامة فقط.' },
  { icon: Activity, to: '/bpr/status', en: 'Operations status', ar: 'حالة التشغيل', tag: 'Health verdict',
    enText: 'The registry’s own health verdict: sites, backups, key, ledger and consistency checks.', arText: 'حكم السجل على صحته: المواقع والنسخ الاحتياطية والمفتاح والسجل الشفاف واتساق البيانات.' },
  { icon: Users, to: '/bpr/join', en: 'Onboarding', ar: 'الانضمام', tag: 'One question per slide',
    enText: 'Arabic-first wizard, ORCID sign-in and reviewed documents that become verified qualifications.', arText: 'معالج عربي أولاً وتسجيل دخول عبر ORCID ومستندات تُراجع لتصبح مؤهلات موثّقة.' },
  { icon: Calculator, href: `${REGISTRY}/tools.php`, en: 'Specialty toolkit', ar: 'أدوات التخصص', tag: 'Members · 13 kits',
    enText: 'Checklists, templates and clinical calculators matched to the specialty. Members only, on the registry.', arText: 'قوائم تحقق وقوالب وحاسبات سريرية حسب التخصص. للأعضاء فقط، على السجل.' },
  { icon: Server, href: 'https://emr.brainsait.de/', en: 'Personal EMR', ar: 'سجل طبي شخصي', tag: 'Members · OpenEMR',
    enText: 'An isolated OpenEMR instance per provider on its own subdomain, database and TLS.', arText: 'نسخة OpenEMR معزولة لكل مقدم رعاية بنطاق فرعي وقاعدة بيانات وشهادة TLS خاصة.' },
];

export default function Overview() {
  const { ar } = useI18n();
  const nav = useNavigate();
  const [spid, setSpid] = useState(SPID);
  const list = useLoad<ProviderList>('/api/providers', 'providers.json');
  const [cred, setCred] = useState<CredentialResult | null>(null);
  const [ledger, setLedger] = useState<LedgerResult | null>(null);
  useEffect(() => { checkCredential(SPID).then(setCred, () => {}); replayLedger().then(setLedger, () => {}); }, []);
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
      title={ar ? 'هوية واحدة موثقة. يمكن لأي شخص التحقق منها.' : 'One trusted identity. Anyone can check it.'}
      lead={ar
        ? 'BPR يمنح كل ممارس صحي معرّفًا دائمًا وشهادة موقّعة وسجلًا عامًا. هذه الصفحات تعيد التحقق بنفسها — التوقيعات وسلسلة التجزئة تُفحص في متصفحك.'
        : 'BPR gives every clinician a permanent ID, a signed credential and a public record. These pages re-check it themselves — signatures and the hash chain are verified in your browser.'}
      actions={<>
        <Link className="profile-button primary" to="/bpr/providers">{ar ? 'تصفح الدليل' : 'Browse the directory'}<ArrowRight size={16} /></Link>
        <a className="profile-button secondary" href={`${REGISTRY}/join.php`} target="_blank" rel="noreferrer">{ar ? 'انضم إلى BPR' : 'Join BPR'}<ArrowUpRight size={16} /></a>
      </>}
    >
      <section className="bpr-live-strip" aria-label={ar ? 'مؤشرات مباشرة' : 'Live indicators'}>
        <div><span>{ar ? 'مقدمو رعاية مدرجون' : 'Listed providers'}</span><strong>{list.state === 'ready' ? items.length : '…'}</strong>{list.state === 'ready' && <SourceBadge source={list.source} />}</div>
        <div><span>{ar ? 'ORCID مؤكد' : 'ORCID confirmed'}</span><strong>{list.state === 'ready' ? linked : '…'}</strong><small>{ar ? 'من الدليل' : 'from the directory'}</small></div>
        <div><span>{ar ? 'شهادات موقّعة سارية' : 'Current signed credentials'}</span><strong>{list.state === 'ready' ? signed : '…'}</strong><small>W3C VC · EdDSA</small></div>
        <div><span>{ar ? 'أسطر السجل الشفاف' : 'Ledger entries'}</span><strong>{ledger ? ledger.head.size : '…'}</strong>{ledger && <SourceBadge source={ledger.source} />}</div>
      </section>

      <section className="bpr-split">
        <div className="bpr-pass">
          <div className="bpr-pass-head"><span>BPR / PROVIDER CREDENTIAL</span><BadgeCheck size={25} /></div>
          <div className="bpr-pass-person"><img src="/assets/img/prof_pic.jpg" alt="" /><div><strong>{cred?.claims.credentialSubject.name || 'Dr. Mohamed El Fadil'}</strong><span>{cred?.claims.credentialSubject.nameAr || 'د. محمد الفاضل'}</span></div></div>
          <dl><div><dt>SPID</dt><dd>{SPID}</dd></div><div><dt>{ar ? 'صالحة حتى' : 'VALID UNTIL'}</dt><dd>{cred ? cred.claims.validUntil.slice(0, 10) : '…'}</dd></div><div><dt>ISSUER</dt><dd>did:web:registry.brainsait.de</dd></div></dl>
          <div className="bpr-pass-foot"><span><Check size={13} />Ed25519 · W3C VC</span><Fingerprint size={29} /></div>
        </div>
        <div className="bpr-panel">
          <h2>{ar ? 'فحص مباشر الآن' : 'Checked just now, in this tab'}</h2>
          <CheckRow label={ar ? 'توقيع الشهادة' : 'Credential signature'} check={cred?.signature || { state: 'pending' }} />
          <CheckRow label={ar ? 'فترة الصلاحية' : 'Validity window'} check={cred?.expiry || { state: 'pending' }} okText={ar ? 'سارية' : 'In date'} />
          <CheckRow label={ar ? 'الحالة المباشرة' : 'Live status'} check={cred?.status || { state: 'pending' }} okText={valueLabel(cred?.status.value, ar)} />
          <CheckRow label={ar ? 'سلسلة التجزئة' : 'Hash chain replay'} check={ledger?.chain || { state: 'pending' }} />
          <CheckRow label={ar ? 'رأس السجل الموقّع' : 'Signed ledger head'} check={ledger?.headSignature || { state: 'pending' }}>
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
        <div className="profile-section-label">01 · {ar ? 'التطبيقات' : 'The apps'}</div>
        <h2 className="bpr-h2">{ar ? 'كل ما في BPR — على هذا الموقع.' : 'Everything BPR does — on this site.'}</h2>
        <div className="bpr-module-grid">
          {MODULES.map(({ icon: Icon, ...m }) => {
            const body = <>
              <div className="bpr-module-top"><Icon size={24} /><small>{m.tag}</small></div>
              <h3>{ar ? m.ar : m.en}</h3><p>{ar ? m.arText : m.enText}</p>
              <strong>{m.to ? (ar ? 'افتح' : 'Open') : (ar ? 'على السجل' : 'On the registry')}{m.to ? <ArrowRight size={14} /> : <ArrowUpRight size={14} />}</strong>
            </>;
            return m.to
              ? <Link key={m.en} to={m.to} className="bpr-module">{body}</Link>
              : <a key={m.en} href={m.href} target="_blank" rel="noreferrer" className="bpr-module members">{body}</a>;
          })}
        </div>
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
