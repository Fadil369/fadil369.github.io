import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown, ArrowUpRight, BookOpen, Boxes, Braces, Check, Command, CreditCard, Download,
  ExternalLink, FileText, Fingerprint, Github, HeartPulse, Hourglass, Languages, Contact,
  Linkedin, Moon, Network, ShieldCheck, Stethoscope, Sun,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { usePageMeta } from '../hooks/usePageMeta';
import { downloadVCard } from '../components/CommandPalette';
import { ProfileHeader } from '../components/ProfileHeader';
import { checkCredential, CredentialResult, load, Provider, Research, useLoad } from '../lib/bpr';
import { SourceBadge, TrustGrid } from '../components/BprKit';
import '../styles/profile.css';

const SPID = 'SA-PHY-000003';

const projects = [
  {
    name: 'BPR — Provider Registry',
    url: '/bpr',
    icon: Fingerprint,
    en: 'Signed, portable provider identity connecting credentials, research and clinical tools — verified on any device.',
    ar: 'هوية موقّعة وقابلة للنقل لمقدم الرعاية، تربط الاعتمادات والأبحاث والأدوات السريرية — تُتحقق من أي جهاز.',
    tags: ['Ed25519', 'W3C VC', 'FHIR R4'],
  },
  {
    name: 'LINC FHIR',
    url: 'https://github.com/Fadil369/brainsait-linc-fhir',
    icon: Network,
    en: 'Bilingual healthcare agents and FHIR integration for the InterSystems ecosystem.',
    ar: 'وكلاء صحيون ثنائيو اللغة وتكامل FHIR ضمن منظومة InterSystems.',
    tags: ['Agents', 'FHIR R4', 'InterSystems'],
  },
  {
    name: 'BrainSAIT RCM',
    url: 'https://github.com/Fadil369/brainsait-rcm',
    icon: HeartPulse,
    en: 'Saudi claims intelligence, rejection management and revenue-cycle automation — NPHIES integration ongoing.',
    ar: 'ذكاء المطالبات السعودية وإدارة الرفض وأتمتة دورة الإيرادات — التكامل مع نفيس جارٍ.',
    tags: ['NPHIES · ongoing', 'Claims', 'TypeScript'],
  },  {
    name: 'Healthcare MCP',
    url: 'https://github.com/Fadil369/brainsait-mcp-dxt',
    icon: Braces,
    en: 'Auditable healthcare connectors giving AI assistants controlled FHIR capabilities.',
    ar: 'موصلات صحية قابلة للتدقيق تمنح المساعدات الذكية قدرات FHIR منضبطة.',
    tags: ['MCP', 'Audit', 'FHIR R4'],
  },
];

const journey = [
  {
    years: '2019 — now', yearsAr: '2019 — الآن',
    en: 'Founder & CEO', ar: 'المؤسس والرئيس التنفيذي', org: 'BrainSAIT Ltd',
    enText: 'Building AI-native healthcare infrastructure, provider identity and interoperable clinical tools.',
    arText: 'بناء بنية صحية أصيلة في الذكاء الاصطناعي، وهوية مقدمي الرعاية، وأدوات سريرية مترابطة.',
  },
  {
    years: '2024 — now', yearsAr: '2024 — الآن',
    en: 'Corporate Physician · RCM', ar: 'طبيب مؤسسي · دورة الإيرادات', org: 'Al Hayat National Hospital',
    enText: 'Claims-rejection review, analysis and resubmission across six branches and contracted payers.',
    arText: 'مراجعة المطالبات المرفوضة وتحليلها وإعادة تقديمها عبر ستة فروع وشركات التأمين المتعاقدة.',
  },
  {
    years: '2021 — 2024', yearsAr: '2021 — 2024',
    en: 'Critical Care & ICU Physician', ar: 'طبيب عناية حرجة ومركزة', org: 'Anfas Medical Care Hospital',
    enText: 'High-acuity care that shaped practical documentation and clinical-handover requirements.',
    arText: 'رعاية الحالات الحرجة التي شكّلت متطلبات عملية للتوثيق وتسليم المرضى.',
  },
  {
    years: '2018 — 2021', yearsAr: '2018 — 2021',
    en: 'Neurosurgery Physician', ar: 'طبيب جراحة أعصاب', org: 'Aster Sanad Hospital',
    enText: 'Multidisciplinary neurosurgical care and coordination across clinical teams.',
    arText: 'رعاية جراحية عصبية متعددة التخصصات وتنسيق بين الفرق السريرية.',
  },
  {
    years: '2016 — 2018', yearsAr: '2016 — 2018',
    en: 'Emergency Medicine Physician', ar: 'طبيب طب طوارئ', org: 'Rafa Medical Center',
    enText: 'Rapid assessment and high-stakes decisions across acute presentations.',
    arText: 'تقييم سريع وقرارات دقيقة للحالات الحادة في بيئات عالية الضغط.',
  },
];

export default function Home() {
  const { ar } = useI18n();
  usePageMeta({
    title: ar ? 'د. محمد الفاضل — طبيب ومؤسس BrainSAIT' : 'Dr. Mohamed El Fadil — Physician & Healthcare AI Founder',
    description: ar
      ? 'طبيب ومؤسس BrainSAIT في الرياض. أبني هوية صحية قابلة للتحقق وأدوات مترابطة للممارسين عبر FHIR والذكاء الاصطناعي؛ والتكامل مع نفيس جارٍ.'
      : 'Physician and BrainSAIT founder in Riyadh, building verifiable provider identity and interoperable clinical tools with FHIR and AI. NPHIES integration is ongoing.',
    url: '/profile',
    type: 'profile',
  });
  useEffect(() => {
    document.documentElement.classList.add('profile-home');
    return () => document.documentElement.classList.remove('profile-home');
  }, []);
  // The hero chip shows the real result of checking the signed BPR credential in this browser.
  const [cred, setCred] = useState<CredentialResult | null | 'error'>(null);
  const [research, setResearch] = useState<Research | null>(null);
  const me = useLoad<Provider>(`/api/providers/${SPID}`, `providers/${SPID}.json`);
  useEffect(() => {
    checkCredential(SPID).then(setCred, () => setCred('error'));
    load<Research>(`/api/research?spid=${SPID}`, `research/${SPID}.json`).then((r) => setResearch(r.data), () => {});
  }, []);
  const credOk = cred && cred !== 'error' && cred.signature.state === 'ok' && cred.expiry.state === 'ok' && cred.status.state === 'ok';

  return (
    <div className="profile-page" id="top">
      <ProfileHeader />
      <div className="profile-content">
        <section className="profile-hero" aria-labelledby="profile-title">
          <div className="profile-hero-copy">
            <div className="profile-eyebrow"><span />{ar ? 'طبيب · مؤسس · صانع حلول صحية' : 'Physician · Founder · Healthcare builder'}</div>
            <h1 id="profile-title">{ar ? 'تقنية صحية من يد الطبيب، لكل طبيب.' : 'Healthcare technology, built by a physician—for every physician.'}</h1>
            <p className="profile-lead">
              {ar
                ? 'أنا د. محمد الفاضل، مؤسس BrainSAIT في الرياض. أحوّل خبرة الطوارئ والعناية المركزة والمطالبات إلى بنية تحتية صحية قابلة للتحقق — من هوية مقدم الرعاية إلى الذكاء الاصطناعي السريري — وكل أداة مصمَّمة لتعيد القرار إلى يد الطبيب.'
                : 'I’m Dr. Mohamed El Fadil, founder of BrainSAIT in Riyadh. I turn emergency, critical-care and claims experience into verifiable healthcare infrastructure—from provider identity to clinical AI—every tool built to put the physician in control.'}
            </p>
            <div className="profile-actions">
              <Link className="profile-button primary" to="/cv"><FileText size={17} />{ar ? 'السيرة الذاتية' : 'Professional CV'}</Link>
              <a className="profile-button secondary" href="https://calendar.app.google/rAqiE6pNumtECdnd7" target="_blank" rel="noreferrer">{ar ? 'احجز مكالمة مباشرة' : 'Book a live call'}<ArrowUpRight size={17} /></a>
              <a className="profile-button text-button" href="#work">{ar ? 'استكشف أعمالي' : 'Explore my work'}<ArrowDown size={17} /></a>
            </div>
            <div className="profile-socials">
              <a href="https://github.com/Fadil369" target="_blank" rel="noreferrer"><Github size={17} />GitHub</a>
              <a href="https://sa.linkedin.com/in/fadil369" target="_blank" rel="noreferrer"><Linkedin size={17} />LinkedIn</a>
              <a href="https://orcid.org/0009-0003-7485-3575" target="_blank" rel="noreferrer">ORCID</a>
            </div>
          </div>
          <div className="profile-portrait-wrap">
            <div className="profile-orbit" aria-hidden="true"><span>FHIR</span><span>NPHIES</span><span>AI</span></div>
            <div className="profile-portrait">
              <img src="/assets/img/prof_pic.jpg" alt={ar ? 'د. محمد الفاضل' : 'Dr. Mohamed El Fadil'} width="520" height="650" />
              <div className="profile-portrait-caption"><span>{ar ? 'الرياض، السعودية' : 'Riyadh, Saudi Arabia'}</span><strong>BrainSAIT</strong></div>
            </div>
            <Link className={`profile-credential${credOk ? ' ok' : ''}`} to={`/bpr/p/${SPID}`}>
              <ShieldCheck size={22} />
              <span>
                <small>{cred === null ? (ar ? 'جارٍ فحص اعتماد BPR…' : 'Checking BPR credential…')
                  : credOk ? (ar ? 'اعتماد BPR موقّع · فُحص في متصفحك' : 'Signed BPR credential · checked in your browser')
                  : (ar ? 'اعتماد BPR · تعذّر الفحص الآن' : 'BPR credential · could not check now')}</small>
                <strong dir="ltr">{SPID}</strong>
                <em><Hourglass size={10} aria-hidden="true" />{ar ? 'الترخيص: تكامل الهيئة جارٍ' : 'Licence: SCFHS integration ongoing'}</em>
              </span>
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>

        <section className="profile-physicians" aria-labelledby="physicians-title">
          <div className="profile-physicians-copy">
            <div className="profile-section-label">BPR · {ar ? 'للأطباء' : 'For physicians'}</div>
            <h2 id="physicians-title">{ar ? 'صُمّم للأطباء. ابدأ بسير عمل واحد مفيد.' : 'Built for physicians. Start with one useful workflow.'}</h2>
            <p>{ar
              ? 'استكشف هويتك المهنية، وملفك البحثي، ومساحة العمل المدعومة بالذكاء الاصطناعي — في عرض قصير بأمثلة مصطنعة، دون أي مستندات.'
              : 'Explore your professional identity, research profile and AI-assisted workspace — in a short demo with synthetic examples, no documents needed.'}</p>
            <div className="profile-actions">
              <a className="profile-button primary" href="#walkthrough">{ar ? 'شاهد الجولة' : 'Watch the walkthrough'}<ArrowDown size={17} /></a>
              <a className="profile-button secondary" href={`https://linkedin-lark-automation.brainsait.de/m/bpr?for=physician-demo&lang=${ar ? 'ar' : 'en'}&utm_source=website&utm_medium=homepage&utm_campaign=bpr_physicians&utm_content=hero`} target="_blank" rel="noopener">{ar ? 'اطلب عرضًا توضيحيًا للأطباء' : 'Request a physician demo'}<ArrowUpRight size={17} /></a>
            </div>
            <p className="profile-physicians-note">{ar ? 'التكامل مع الهيئة السعودية للتخصصات الصحية ونفيس جارٍ.' : 'SCFHS and NPHIES integration is ongoing.'}</p>
          </div>
          <figure className="profile-physicians-video" id="walkthrough">
            <video src="https://elfadil.brainsait.de/media/bpr-walkthrough.mp4" poster="https://elfadil.brainsait.de/media/bpr-walkthrough.jpg" controls playsInline preload="none"
              aria-label={ar ? 'جولة BPR في 54 ثانية' : 'BPR walkthrough, 54 seconds'} width={540} height={960} />
            <figcaption>{ar ? 'جولة BPR · 54 ثانية' : 'BPR walkthrough · 54 seconds'}</figcaption>
          </figure>
        </section>

        <section className="profile-proof" aria-label={ar ? 'نبذة مهنية' : 'Professional highlights'}>
          <div><strong>2010</strong><span>{ar ? 'بداية المسار الطبي' : 'Medical journey began'}</span></div>
          <div><strong>6</strong><span>{ar ? 'فروع في مراجعة المطالبات' : 'Branches in claims review'}</span></div>
          <div><strong>2</strong><span>{ar ? 'حزم مفتوحة المصدر على PyPI' : 'Open-source PyPI packages'}</span></div>
          <div><strong>{research ? research.counts.publisher_confirmed : '…'}</strong><span>{ar ? 'أعمال بتأليف مؤكد من الناشر' : 'Publisher-confirmed works'}</span></div>
        </section>

        <section className="profile-section profile-thesis">
          <div className="profile-section-label">01 · {ar ? 'الفكرة' : 'The thesis'}</div>
          <div>
            <h2>{ar ? 'الطبيب يقرر — والهندسة تكسب الثقة.' : 'The physician decides. Engineering earns the trust.'}</h2>
            <p>{ar
              ? 'من غرفة الطوارئ إلى مكتب المطالبات، واجهتُ المشكلة نفسها: أنظمة صُمِّمت لخدمة الجميع إلا الطبيب صاحب القرار. لذلك أبني أدوات تجمع الهوية والبيانات والمساءلة في طبقة واحدة مترابطة — الرعاية الصحية أولًا، والتحقق دائمًا.'
              : 'From the emergency room to the claims desk, I met the same problem: systems designed around everyone except the physician making the call. So I build tools where identity, data and accountability form one connected layer—healthcare first, verifiable always.'}</p>
          </div>
        </section>

        <section className="profile-section" id="work">
          <div className="profile-section-heading">
            <div><div className="profile-section-label">02 · {ar ? 'أعمال مختارة' : 'Selected work'}</div><h2>{ar ? 'من السرير إلى النظام. أدوات تستحق الثقة، ويمكن التحقق منها.' : 'From bedside to system. Every tool built to be trusted and verified.'}</h2></div>
            <a href="https://github.com/Fadil369" target="_blank" rel="noreferrer">{ar ? 'كل المستودعات' : 'All repositories'}<ArrowUpRight size={16} /></a>
          </div>
          <div className="profile-projects">
            {projects.map(({ icon: Icon, ...project }) => {
              const body = <>
                <div className="profile-project-top"><Icon size={25} /><ArrowUpRight size={18} /></div>
                <h3>{project.name}</h3><p>{ar ? project.ar : project.en}</p>
                <div className="profile-tags">{project.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
              </>;
              return project.url.startsWith('/')
                ? <Link className="profile-project" to={project.url} key={project.name}>{body}</Link>
                : <a className="profile-project" href={project.url} target="_blank" rel="noreferrer" key={project.name}>{body}</a>;
            })}
          </div>
        </section>

        <section className="profile-feature profile-feature-live">
          <div>
            <div className="profile-section-label">BPR · BrainSAIT</div>
            <h2>{ar ? 'هوية واحدة. يمكنك التحقق منها بنفسك.' : 'One identity. You can verify it yourself.'}</h2>
            <p>{ar
              ? 'هذه حالتي في سجل BPR، تُقرأ مباشرة الآن. كل بُعد مستقل بذاته — وما لم يُقيَّم بعد يظهر كما هو، بلا زيادة ولا نقصان.'
              : 'This is my state in the BPR registry, read live. Each dimension is separate — and what has not been assessed yet shows as exactly that, nothing more, nothing less.'}</p>
            <div className="profile-actions">
              <Link className="profile-button secondary" to={`/bpr/verify?spid=${SPID}`}>{ar ? 'تحقق على جهازك' : 'Verify on your device'}<ArrowUpRight size={16} /></Link>
              <Link className="profile-button secondary" to="/bpr/workspace">{ar ? 'استكشف أدوات BPR' : 'Explore BPR tools'}<ArrowUpRight size={16} /></Link>
              <Link className="profile-text-link" to="/bpr/record">{ar ? 'سجل BPR الكامل' : 'My full BPR record'}<ArrowUpRight size={16} /></Link>
            </div>
          </div>
          <div className="profile-feature-trust">
            {me.state === 'ready' ? <><div className="profile-feature-trust-head"><code dir="ltr">{SPID}</code><SourceBadge source={me.source} /></div><TrustGrid trust={me.data.trust} legend={false} /></> : <div className="profile-feature-visual" aria-hidden="true"><code>identity → interoperability → intelligence</code></div>}
          </div>
        </section>

        <section className="profile-section" id="journey">
          <div className="profile-section-label">03 · {ar ? 'المسار' : 'The journey'}</div>
          <div className="profile-section-heading"><h2>{ar ? 'كل موقف سريري صار متطلبًا في المنتج.' : 'Every clinical moment became a product requirement.'}</h2></div>
          <div className="profile-journey">
            {journey.map(item => (
              <article key={item.years}>
                <time dir={ar ? 'rtl' : 'ltr'}>{ar ? item.yearsAr : item.years}</time>
                <div><h3>{ar ? item.ar : item.en}</h3><strong>{item.org}</strong><p>{ar ? item.arText : item.enText}</p></div>
              </article>
            ))}
            <article><time>MBBS</time><div><h3>{ar ? 'بكالوريوس الطب والجراحة' : 'Bachelor of Medicine & Surgery'}</h3><strong>International University of Africa</strong></div></article>
          </div>
        </section>

        <section className="profile-section" id="research">
          <div className="profile-section-label">04 · {ar ? 'بحث وكتابة' : 'Research & writing'}</div>
          <div className="profile-section-heading"><h2>{ar ? 'أبحاث تُنسب إلى صاحبها بالدليل.' : 'Research, traced to its author with proof.'}</h2></div>
          <div className="profile-research-grid">
            <a className="profile-paper" href="https://doi.org/10.5281/zenodo.23606022" target="_blank" rel="noreferrer">
              <BookOpen size={28} /><span className="profile-paper-meta">ZENODO · V1.2 · 2026</span>
              <h2>{ar ? 'المشاع السريري' : 'The Clinical Commons'}</h2>
              <p>{ar ? 'تصميم مؤسسي مقترح للمستشفيات: فرق سريرية متعددة التخصصات، إدارة خاضعة للمساءلة، وإشراف مجتمعي — يبدأ بتجربة محدودة وقابلة للتراجع.' : 'A proposed hospital design: multidisciplinary clinical stewardship, accountable management and community oversight—beginning with a limited, reversible pilot.'}</p>
              <span className="profile-text-link">{ar ? 'اقرأ الدراسة' : 'Read the study'}<ArrowUpRight size={16} /></span>
            </a>
            <div className="profile-writing">
              {research && <Link className="profile-footprint" to={`/bpr/research/${SPID}`}>
                <span><strong>{research.counts.dois}</strong>{ar ? 'أعمال بمعرّف DOI' : 'DOI-registered works'}</span>
                <span><strong>{research.metrics.zenodo_downloads}</strong>{ar ? 'تنزيل من Zenodo' : 'Zenodo downloads'}</span>
                <span><strong>{research.metrics.hf_downloads}</strong>{ar ? 'تنزيل من Hugging Face' : 'Hugging Face downloads'}</span>
                <small>{ar ? 'مباشر من البصمة البحثية في BPR' : 'Live from the BPR research footprint'}<ArrowUpRight size={12} /></small>
              </Link>}
              <h3>{ar ? 'أدوات ومعرفة مفتوحة' : 'Open tools & knowledge'}</h3>
              <a href="https://pypi.org/project/brainsait-pyheart/" target="_blank" rel="noreferrer"><span><strong>brainsait-pyheart</strong><small>FHIR / HL7 interoperability</small></span><ArrowUpRight size={17} /></a>
              <a href="https://pypi.org/project/brainsait-pybrain/" target="_blank" rel="noreferrer"><span><strong>brainsait-pybrain</strong><small>Clinical NLP & data intelligence</small></span><ArrowUpRight size={17} /></a>
              <a href="https://elfadil.brainsait.de/the_leverage_point.html" target="_blank" rel="noreferrer"><span><strong>{ar ? 'نقطة الرفع' : 'The Leverage Point'}</strong><small>{ar ? 'مقال مختار' : 'Selected essay'}</small></span><ArrowUpRight size={17} /></a>
              <a href="https://zenodo.org/communities/bpr-doctors/" target="_blank" rel="noreferrer"><span><strong>BPR · Zenodo</strong><small>{ar ? 'سجل بحثي قابل للاستشهاد' : 'Citable research record'}</small></span><ArrowUpRight size={17} /></a>
            </div>
          </div>
        </section>

        <section className="profile-contact" id="contact">
          <div><div className="profile-section-label">05 · {ar ? 'لنتحدث' : 'Start a conversation'}</div><h2>{ar ? 'تبني شيئًا مع الممارسين الصحيين؟ دعنا نبنيه معًا.' : 'Building with clinicians? Let’s build it together.'}</h2></div>
          <p>{ar ? 'أعمل مع المستشفيات وفرق التقنية الصحية والمستثمرين في السعودية والخليج وأفريقيا — لبناء أدوات صحية يمكن التحقق منها فعليًا، وتعيد القرار إلى يد الطبيب.' : 'I work with hospitals, health-tech teams and investors across Saudi Arabia, the Gulf and Africa—building healthcare tools you can actually verify, and that put control back in the physician’s hands.'}</p>
          <div className="profile-actions">
            <a className="profile-button primary" href="https://calendar.app.google/rAqiE6pNumtECdnd7" target="_blank" rel="noreferrer">{ar ? 'احجز مكالمة الآن' : 'Book a call now'}<ArrowUpRight size={17} /></a>
            <a className="profile-button secondary" href="mailto:elfadil369@icloud.com">{ar ? 'راسلني' : 'Email me'}</a>
            <button className="profile-button secondary" onClick={downloadVCard}><Contact size={16} />{ar ? 'حفظ جهة الاتصال' : 'Save contact'}</button>
          </div>
        </section>
      </div>
      <footer className="profile-footer">
        <span>© {new Date().getFullYear()} Dr. Mohamed El Fadil</span>
        <div><a href="https://calendar.app.google/rAqiE6pNumtECdnd7" target="_blank" rel="noreferrer">{ar ? 'احجز موعدًا' : 'Book a call'}</a><Link to="/bpr">BPR</Link><Link to="/card">{ar ? 'البطاقة' : 'Card'}</Link><Link to="/cv"><FileText size={14} />{ar ? 'السيرة' : 'CV'}</Link></div>
        <span className="profile-verified"><Check size={13} />{ar ? 'مصمم ليكون قابلاً للتحقق' : 'Designed to be verifiable'}</span>
      </footer>
    </div>
  );
}
