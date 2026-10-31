import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown, ArrowUpRight, BookOpen, Boxes, Braces, Check, CreditCard, Download,
  ExternalLink, FileText, Fingerprint, Github, HeartPulse, Languages,
  Linkedin, Moon, Network, ShieldCheck, Stethoscope, Sun,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { usePageMeta } from '../hooks/usePageMeta';
import '../styles/profile.css';

const projects = [
  {
    name: 'BPR — Provider Registry',
    url: 'https://registry.brainsait.de/p/SA-PHY-000003',
    icon: Fingerprint,
    en: 'A signed, portable provider identity connecting credentials, research and clinical tools.',
    ar: 'هوية موقّعة وقابلة للنقل لمقدم الرعاية، تربط الاعتمادات والأبحاث والأدوات السريرية.',
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
    en: 'Saudi claims intelligence, rejection management and revenue-cycle automation.',
    ar: 'ذكاء المطالبات السعودية وإدارة الرفض وأتمتة دورة الإيرادات.',
    tags: ['NPHIES', 'Claims', 'TypeScript'],
  },
  {
    name: 'Healthcare MCP',
    url: 'https://github.com/Fadil369/brainsait-mcp-dxt',
    icon: Braces,
    en: 'Auditable healthcare connectors that give AI assistants controlled FHIR capabilities.',
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

export function ProfileHeader() {
  const { ar, toggle } = useI18n();
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme !== 'light');
  const switchTheme = () => {
    const next = dark ? 'light' : 'dark';
    setDark(!dark);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('bs-theme', next); } catch { /* storage is optional */ }
  };
  return (
    <header className="profile-head">
      <Link className="profile-brand" to="/" aria-label="Dr. Mohamed El Fadil">
        <span>EF</span><strong>{ar ? 'د. محمد الفاضل' : 'Dr. El Fadil'}</strong>
      </Link>
      <nav aria-label={ar ? 'التنقل الرئيسي' : 'Main navigation'}>
        <Link to="/#work">{ar ? 'الأعمال' : 'Work'}</Link>
        <Link to="/#journey">{ar ? 'المسار' : 'Journey'}</Link>
        <Link to="/#research">{ar ? 'البحث' : 'Research'}</Link>
        <Link to="/catalogue">BPR Hub</Link>
        <Link to="/card">{ar ? 'البطاقة' : 'Card'}</Link>
      </nav>
      <div className="profile-controls">
        <button onClick={switchTheme} aria-label={dark ? (ar ? 'الوضع الفاتح' : 'Light mode') : (ar ? 'الوضع الداكن' : 'Dark mode')}>
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <button onClick={toggle} aria-label={ar ? 'Switch to English' : 'التبديل إلى العربية'}>
          <Languages size={16} /><span>{ar ? 'EN' : 'ع'}</span>
        </button>
      </div>
    </header>
  );
}

export default function Home() {
  const { ar } = useI18n();
  usePageMeta({
    title: ar ? 'د. محمد الفاضل — طبيب ومؤسس BrainSAIT' : 'Dr. Mohamed El Fadil — Physician & Healthcare AI Founder',
    description: ar
      ? 'طبيب ومؤسس BrainSAIT في الرياض. أبني هوية صحية قابلة للتحقق وأدوات مترابطة للممارسين عبر FHIR وNPHIES والذكاء الاصطناعي.'
      : 'Physician and BrainSAIT founder in Riyadh, building verifiable provider identity and interoperable clinical tools with FHIR, NPHIES and AI.',
    url: '/',
    type: 'profile',
  });
  useEffect(() => {
    document.documentElement.classList.add('profile-home');
    return () => document.documentElement.classList.remove('profile-home');
  }, []);

  return (
    <div className="profile-page" id="top">
      <ProfileHeader />
      <div className="profile-content">
        <section className="profile-hero" aria-labelledby="profile-title">
          <div className="profile-hero-copy">
            <div className="profile-eyebrow"><span />{ar ? 'طبيب · مؤسس · مهندس حلول صحية' : 'Physician · Founder · Healthcare builder'}</div>
            <h1 id="profile-title">{ar ? 'أبني تقنية صحية تبدأ من الطبيب.' : 'Healthcare technology, built around the physician.'}</h1>
            <p className="profile-lead">
              {ar
                ? 'أنا د. محمد الفاضل، مؤسس BrainSAIT في الرياض. أحوّل خبرة الطوارئ والعناية المركزة والمطالبات إلى بنية تحتية قابلة للتحقق — من هوية مقدم الرعاية إلى الذكاء الاصطناعي السريري.'
                : 'I’m Dr. Mohamed El Fadil, founder of BrainSAIT in Riyadh. I turn emergency, critical-care and claims experience into verifiable infrastructure—from provider identity to clinical AI.'}
            </p>
            <div className="profile-actions">
              <a className="profile-button primary" href="#work">{ar ? 'استكشف أعمالي' : 'Explore my work'}<ArrowDown size={17} /></a>
              <Link className="profile-button secondary" to="/cv">
                <Download size={17} />{ar ? 'السيرة الذاتية' : 'Professional CV'}
              </Link>
              <Link className="profile-button text-button" to="/card">
                <CreditCard size={17} />{ar ? 'بطاقة الأعمال' : 'Business card'}
              </Link>
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
            <a className="profile-credential" href="https://registry.brainsait.de/p/SA-PHY-000003" target="_blank" rel="noreferrer">
              <ShieldCheck size={22} /><span><small>{ar ? 'هوية موثقة' : 'Verifiable identity'}</small><strong dir="ltr">SA-PHY-000003</strong></span><ArrowUpRight size={16} />
            </a>
          </div>
        </section>

        <section className="profile-proof" aria-label={ar ? 'نبذة مهنية' : 'Professional highlights'}>
          <div><strong>2010</strong><span>{ar ? 'بداية المسار الطبي' : 'Medical journey began'}</span></div>
          <div><strong>6</strong><span>{ar ? 'فروع في مراجعة المطالبات' : 'Branches in claims review'}</span></div>
          <div><strong>2</strong><span>{ar ? 'حزم مفتوحة المصدر على PyPI' : 'Open-source PyPI packages'}</span></div>
          <div><strong>AR / EN</strong><span>{ar ? 'تصميم ثنائي اللغة' : 'Bilingual by design'}</span></div>
        </section>

        <section className="profile-section profile-thesis">
          <div className="profile-section-label">01 · {ar ? 'الفكرة' : 'The thesis'}</div>
          <div>
            <h2>{ar ? 'الحكم السريري يحدد ما نبنيه. والهندسة تحدد إن كان يستحق الثقة.' : 'Clinical judgement decides what ships. Engineering decides whether it can be trusted.'}</h2>
            <p>{ar
              ? 'من غرفة الطوارئ إلى مكتب المطالبات، رأيت المشكلة نفسها: أنظمة صُممت حول الجميع إلا الطبيب الذي يتخذ القرار. لذلك أبني أدوات تجعل الهوية والبيانات والمساءلة جزءًا واحدًا مترابطًا.'
              : 'From the emergency room to the claims desk, I found the same problem: systems designed around everyone except the physician making the call. I build tools where identity, data and accountability form one connected layer.'}</p>
          </div>
        </section>

        <section className="profile-section" id="work">
          <div className="profile-section-heading">
            <div><div className="profile-section-label">02 · {ar ? 'أعمال مختارة' : 'Selected work'}</div><h2>{ar ? 'من السرير إلى النظام.' : 'From bedside to system.'}</h2></div>
            <a href="https://github.com/Fadil369" target="_blank" rel="noreferrer">{ar ? 'كل المستودعات' : 'All repositories'}<ArrowUpRight size={16} /></a>
          </div>
          <div className="profile-projects">
            {projects.map(({ icon: Icon, ...project }) => (
              <a className="profile-project" href={project.url} target="_blank" rel="noreferrer" key={project.name}>
                <div className="profile-project-top"><Icon size={25} /><ArrowUpRight size={18} /></div>
                <h3>{project.name}</h3><p>{ar ? project.ar : project.en}</p>
                <div className="profile-tags">{project.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
              </a>
            ))}
          </div>
        </section>

        <section className="profile-feature">
          <div className="profile-feature-visual" aria-hidden="true">
            <div className="profile-signal"><Stethoscope size={34} /><span /><Fingerprint size={40} /><span /><Boxes size={34} /></div>
            <code>identity → interoperability → intelligence</code>
          </div>
          <div>
            <div className="profile-section-label">BPR · BrainSAIT</div>
            <h2>{ar ? 'هوية واحدة. كل الأدوات التي ينبغي أن تتبعها.' : 'One identity. Every tool that should follow it.'}</h2>
            <p>{ar
              ? 'يضع سجل مقدمي الخدمة BPR الطبيب في قلب قابل للتحقق والتدقيق داخل منظومة الرعاية، بدل أن يكون مجرد نقطة نهاية في أنظمة متفرقة.'
              : 'The BrainSAIT Provider Registry places the physician at a verifiable, auditable centre of care—not as another endpoint across disconnected systems.'}</p>
            <a className="profile-text-link" href="https://elfadil.brainsait.de" target="_blank" rel="noreferrer">{ar ? 'ادخل التجربة التفاعلية' : 'Enter the interactive portfolio'}<ExternalLink size={16} /></a>
          </div>
        </section>

        <section className="profile-section" id="journey">
          <div className="profile-section-label">03 · {ar ? 'المسار' : 'The journey'}</div>
          <div className="profile-section-heading"><h2>{ar ? 'خبرة سريرية تتحول إلى متطلبات منتج.' : 'Clinical experience becomes product requirements.'}</h2></div>
          <div className="profile-journey">
            {journey.map(item => (
              <article key={item.years}>
                <time dir="ltr">{ar ? item.yearsAr : item.years}</time>
                <div><h3>{ar ? item.ar : item.en}</h3><strong>{item.org}</strong><p>{ar ? item.arText : item.enText}</p></div>
              </article>
            ))}
            <article><time>MBBS</time><div><h3>{ar ? 'بكالوريوس الطب والجراحة' : 'Bachelor of Medicine & Surgery'}</h3><strong>International University of Africa</strong></div></article>
          </div>
        </section>

        <section className="profile-section" id="research">
          <div className="profile-section-label">04 · {ar ? 'بحث وكتابة' : 'Research & writing'}</div>
          <div className="profile-research-grid">
            <a className="profile-paper" href="https://doi.org/10.5281/zenodo.23606022" target="_blank" rel="noreferrer">
              <BookOpen size={28} /><span className="profile-paper-meta">ZENODO · V1.2 · 2026</span>
              <h2>{ar ? 'المشاع السريري' : 'The Clinical Commons'}</h2>
              <p>{ar ? 'تصميم مؤسسي مقترح للمستشفيات: فرق سريرية متعددة التخصصات، إدارة خاضعة للمساءلة، وإشراف مجتمعي — يبدأ بتجربة محدودة وقابلة للتراجع.' : 'A proposed hospital design: multidisciplinary clinical stewardship, accountable management and community oversight—beginning with a limited, reversible pilot.'}</p>
              <span className="profile-text-link">{ar ? 'اقرأ الدراسة' : 'Read the study'}<ArrowUpRight size={16} /></span>
            </a>
            <div className="profile-writing">
              <h3>{ar ? 'أدوات ومعرفة مفتوحة' : 'Open tools & knowledge'}</h3>
              <a href="https://pypi.org/project/brainsait-pyheart/" target="_blank" rel="noreferrer"><span><strong>brainsait-pyheart</strong><small>FHIR / HL7 interoperability</small></span><ArrowUpRight size={17} /></a>
              <a href="https://pypi.org/project/brainsait-pybrain/" target="_blank" rel="noreferrer"><span><strong>brainsait-pybrain</strong><small>Clinical NLP & data intelligence</small></span><ArrowUpRight size={17} /></a>
              <a href="https://elfadil.brainsait.de/the_leverage_point.html" target="_blank" rel="noreferrer"><span><strong>{ar ? 'نقطة الرفع' : 'The Leverage Point'}</strong><small>{ar ? 'مقال مختار' : 'Selected essay'}</small></span><ArrowUpRight size={17} /></a>
              <a href="https://zenodo.org/communities/bpr-doctors/" target="_blank" rel="noreferrer"><span><strong>BPR · Zenodo</strong><small>{ar ? 'سجل بحثي قابل للاستشهاد' : 'Citable research record'}</small></span><ArrowUpRight size={17} /></a>
            </div>
          </div>
        </section>

        <section className="profile-contact">
          <div><div className="profile-section-label">05 · {ar ? 'لنتحدث' : 'Start a conversation'}</div><h2>{ar ? 'تبني شيئًا مع الممارسين الصحيين؟' : 'Building something with clinicians?'}</h2></div>
          <p>{ar ? 'أعمل مع المستشفيات وفرق التقنية الصحية والمستثمرين في السعودية والخليج وأفريقيا.' : 'I work with hospitals, health-tech teams and investors across Saudi Arabia, the Gulf and Africa.'}</p>
          <div className="profile-actions">
            <a className="profile-button primary" href="https://elfadil.brainsait.de/#contact" target="_blank" rel="noreferrer">{ar ? 'احجز مكالمة' : 'Book a call'}<ArrowUpRight size={17} /></a>
            <a className="profile-button secondary" href="mailto:elfadil369@icloud.com">{ar ? 'راسلني' : 'Email me'}</a>
          </div>
        </section>
      </div>
      <footer className="profile-footer">
        <span>© {new Date().getFullYear()} Dr. Mohamed El Fadil</span>
        <div><a href="https://elfadil.brainsait.de" target="_blank" rel="noreferrer">elfadil.brainsait.de</a><Link to="/catalogue">BPR Hub</Link><Link to="/card">Card</Link><Link to="/cv"><FileText size={14} />CV</Link></div>
        <span className="profile-verified"><Check size={13} />{ar ? 'مصمم ليكون قابلاً للتحقق' : 'Designed to be verifiable'}</span>
      </footer>
    </div>
  );
}
