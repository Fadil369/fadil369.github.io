import { FormEvent, useState } from 'react';
import { ArrowUpRight, BadgeCheck, BookOpen, Braces, Building2, Check, ChevronRight, Fingerprint, KeyRound, Network, Search, ShieldCheck, Stethoscope } from 'lucide-react';
import { useI18n } from '../i18n';
import { usePageMeta } from '../hooks/usePageMeta';
import { ProfileHeader } from './Home';
import '../styles/profile.css';

const offers = [
  {
    icon: Fingerprint, number: '01', en: 'Provider identity', ar: 'هوية مقدم الرعاية',
    enText: 'One signed, portable professional record for your credentials, research and clinical footprint.',
    arText: 'سجل مهني واحد موقّع وقابل للنقل لاعتماداتك وأبحاثك وبصمتك السريرية.',
    enAction: 'Join the registry', arAction: 'انضم إلى السجل', url: 'https://registry.brainsait.de/', tag: 'BPR ID',
  },
  {
    icon: ShieldCheck, number: '02', en: 'Public verification', ar: 'التحقق العلني',
    enText: 'Verify a provider credential, signature and live status—without creating an account.',
    arText: 'تحقق من شهادة مقدم الرعاية وتوقيعها وحالتها المباشرة دون إنشاء حساب.',
    enAction: 'Verify a provider', arAction: 'تحقق من مقدم خدمة', url: 'https://verify.brainsait.de/', tag: 'FREE',
  },
  {
    icon: Building2, number: '03', en: 'Organization registry', ar: 'سجل المؤسسات',
    enText: 'A verifiable organizational layer connecting facilities, teams and provider relationships.',
    arText: 'طبقة مؤسسية قابلة للتحقق تربط المنشآت والفرق وعلاقات مقدمي الرعاية.',
    enAction: 'Explore organizations', arAction: 'استكشف المؤسسات', url: 'https://registry.brainsait.de/', tag: 'FHIR R4',
  },
  {
    icon: Braces, number: '04', en: 'Developer integration', ar: 'تكامل المطورين',
    enText: 'FHIR resources, verifiable credentials and public endpoints for health-system integration.',
    arText: 'موارد FHIR وشهادات قابلة للتحقق ونقاط وصول عامة للتكامل مع الأنظمة الصحية.',
    enAction: 'Open the registry', arAction: 'افتح السجل', url: 'https://registry.brainsait.de/', tag: 'API',
  },
];

export default function BprHub() {
  const { ar } = useI18n();
  const [spid, setSpid] = useState('SA-PHY-000003');
  usePageMeta({
    title: ar ? 'BPR — هوية موثقة لكل ممارس صحي' : 'BPR — Verifiable identity for every clinician',
    description: ar ? 'سجل برينسايت لمقدمي الخدمة: هوية موقعة، تحقق عام، موارد FHIR وبحث مترابط.' : 'The BrainSAIT Provider Registry: signed identity, public verification, FHIR resources and connected research.',
    url: '/catalogue', type: 'website',
  });
  const verify = (event: FormEvent) => {
    event.preventDefault();
    const id = spid.trim().toUpperCase();
    if (id) window.open(`https://verify.brainsait.de/${encodeURIComponent(id)}`, '_blank', 'noopener,noreferrer');
  };
  return (
    <div className="profile-page bpr-hub" id="top">
      <ProfileHeader />
      <div className="profile-content">
        <section className="bpr-hero">
          <div>
            <div className="profile-eyebrow"><span />BrainSAIT Provider Registry</div>
            <h1>{ar ? 'هوية واحدة موثقة. لكل ممارس صحي.' : 'One trusted identity. For every clinician.'}</h1>
            <p>{ar
              ? 'BPR هو طبقة الهوية والتحقق في منظومة BrainSAIT. سجل موقّع يربط مقدم الرعاية بالشهادات والأبحاث والأدوات — ويمنح أي شخص طريقة عامة للتحقق.'
              : 'BPR is the identity and verification layer of the BrainSAIT ecosystem. A signed record connecting each clinician to credentials, research and tools—with public verification for everyone.'}</p>
            <div className="profile-actions">
              <a className="profile-button primary" href="https://registry.brainsait.de/" target="_blank" rel="noreferrer">{ar ? 'انضم إلى BPR' : 'Join BPR'}<ArrowUpRight size={17} /></a>
              <a className="profile-button secondary" href="#verify">{ar ? 'تحقق من هوية' : 'Verify an identity'}<Search size={16} /></a>
            </div>
          </div>
          <div className="bpr-pass">
            <div className="bpr-pass-head"><span>BPR / PROVIDER CREDENTIAL</span><BadgeCheck size={25} /></div>
            <div className="bpr-pass-person"><img src="/assets/img/prof_pic.jpg" alt="" /><div><strong>Dr. Mohamed El Fadil</strong><span>د. محمد الفاضل</span></div></div>
            <dl><div><dt>SPID</dt><dd>SA-PHY-000003</dd></div><div><dt>ROLE</dt><dd>Physician · Founder</dd></div><div><dt>DID</dt><dd>did:web:registry.brainsait.de</dd></div></dl>
            <div className="bpr-pass-foot"><span><Check size={13} />Ed25519 · W3C VC</span><Fingerprint size={29} /></div>
          </div>
        </section>

        <section className="bpr-verify" id="verify">
          <div><ShieldCheck size={27} /><div><h2>{ar ? 'تحقق من مقدم خدمة' : 'Verify a provider'}</h2><p>{ar ? 'أدخل معرّف BPR لفتح سجل التحقق العام.' : 'Enter a BPR identifier to open the public verification record.'}</p></div></div>
          <form onSubmit={verify}><label className="sr-only" htmlFor="spid">BPR SPID</label><input id="spid" dir="ltr" value={spid} onChange={e => setSpid(e.target.value)} pattern="SA-[A-Z]+-[0-9]+" required /><button type="submit">{ar ? 'تحقق الآن' : 'Verify now'}<ChevronRight size={17} /></button></form>
        </section>

        <section className="profile-section bpr-offers">
          <div className="profile-section-label">01 · {ar ? 'طبقة الهوية' : 'Identity infrastructure'}</div>
          <div className="profile-section-heading"><h2>{ar ? 'كل ما يبدأ بهوية موثوقة.' : 'Everything starts with trusted identity.'}</h2></div>
          <div className="bpr-offer-grid">
            {offers.map(({ icon: Icon, ...offer }) => <a href={offer.url} target="_blank" rel="noreferrer" key={offer.number} className="bpr-offer">
              <div className="bpr-offer-meta"><span>{offer.number}</span><small>{offer.tag}</small></div><Icon size={28} />
              <h3>{ar ? offer.ar : offer.en}</h3><p>{ar ? offer.arText : offer.enText}</p>
              <strong>{ar ? offer.arAction : offer.enAction}<ArrowUpRight size={15} /></strong>
            </a>)}
          </div>
        </section>

        <section className="bpr-architecture">
          <div className="profile-section-label">02 · {ar ? 'مصمم للتشغيل البيني' : 'Designed for interoperability'}</div>
          <h2>{ar ? 'من الهوية إلى الدليل، دون فقدان الثقة.' : 'From identity to evidence, without losing trust.'}</h2>
          <div className="bpr-flow">
            <div><Stethoscope size={25} /><strong>{ar ? 'مقدم الرعاية' : 'Provider'}</strong><span>SPID · Profile</span></div><i />
            <div><KeyRound size={25} /><strong>{ar ? 'شهادة موقعة' : 'Signed credential'}</strong><span>Ed25519 · did:web</span></div><i />
            <div><Network size={25} /><strong>{ar ? 'بيانات مترابطة' : 'Connected data'}</strong><span>FHIR R4 · Research</span></div><i />
            <div><ShieldCheck size={25} /><strong>{ar ? 'تحقق عام' : 'Public proof'}</strong><span>Status · Signature</span></div>
          </div>
          <div className="bpr-code" dir="ltr"><span>$</span><code>brainsait verify --provider SA-PHY-000003</code><a href="https://registry.brainsait.de/" target="_blank" rel="noreferrer">API <ArrowUpRight size={14} /></a></div>
        </section>

        <section className="profile-contact bpr-contact">
          <div><div className="profile-section-label">03 · BrainSAIT</div><h2>{ar ? 'الهوية هي البداية، وليست منتجًا آخر.' : 'Identity is the foundation—not another product.'}</h2></div>
          <p>{ar ? 'استكشف البحث والسجل الحي، أو اربط مؤسستك بطبقة هوية صحية قابلة للتحقق.' : 'Explore the research and live registry, or connect your organization to a verifiable healthcare identity layer.'}</p>
          <div className="profile-actions"><a className="profile-button primary" href="https://registry.brainsait.de/" target="_blank" rel="noreferrer">{ar ? 'افتح السجل الحي' : 'Open the live registry'}<ArrowUpRight size={16} /></a><a className="profile-button secondary" href="https://zenodo.org/communities/bpr-doctors/" target="_blank" rel="noreferrer"><BookOpen size={16} />{ar ? 'أبحاث BPR' : 'BPR research'}</a></div>
        </section>
      </div>
      <footer className="profile-footer"><span>© {new Date().getFullYear()} BrainSAIT · BPR</span><div><a href="https://registry.brainsait.de/" target="_blank" rel="noreferrer">Registry</a><a href="https://verify.brainsait.de/" target="_blank" rel="noreferrer">Verify</a><a href="https://doi.org/10.5281/zenodo.23606022" target="_blank" rel="noreferrer">Research</a></div><span className="profile-verified"><Check size={13} />Provider-first infrastructure</span></footer>
    </div>
  );
}
