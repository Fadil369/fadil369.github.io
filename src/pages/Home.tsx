import { Link } from 'react-router-dom';
import { BookOpen, Hammer, Boxes, ArrowLeft, Sparkles } from 'lucide-react';
import data from '../data/catalog.json';
import type { Catalog } from '../types';
import { useI18n, money } from '../i18n';
import ProductCard from '../components/ProductCard';

const cat = data as unknown as Catalog;
const ICONS = [BookOpen, Hammer, Boxes];
const ACCENTS = ['learn', 'build', 'solutions'];

export default function Home() {
  const { ar, t } = useI18n();
  const featured = cat.learn.slice(0, 8);
  const counts: Record<string, number> = {
    learn: cat.learn.length,
    build: cat.build.courses.length + 1,
    solutions: cat.solutions.length,
  };

  return (
    <main className="page">
      <section className="hero reveal">
        <span className="hero-eyebrow"><span className="dot" /> {ar ? 'متجر برينسايت الفاخر' : 'The BrainSAIT Luxury Store'}</span>
        <h1>{ar ? 'تعلّم · ابنِ · حلول' : 'Learn · Build · Solutions'}</h1>
        <p className="lede">
          {ar
            ? 'مكتبة رقمية، برنامج احتضان، وبرمجيات جاهزة — صممناها لترتقي بك. أنيقة في كل تفصيلة، قوية في كل ميزة.'
            : 'A digital library, an incubation program, and production-ready software — crafted to elevate you. Elegant in every detail, powerful in every feature.'}
        </p>
      </section>

      <section className="entity reveal">
        <span className="hero-eyebrow"><span className="dot gold" /> {ar ? 'جمعية العقل السعودي لأنظمة الحلول المتطورة' : 'The Saudi Society for Advanced Solution Systems'}</span>
        <div className="entity-mark">ب</div>
        <h2 className="entity-abbr">BRAINSAIT</h2>
        <p className="entity-official">
          {ar
            ? 'جهة حكومية رسمية تابعة لحكومة المملكة العربية السعودية — منصة رائدة ومحرك رئيسي للتحول الرقمي، ترتكز على القوة الفكرية الجماعية والذكاء الاصطناعي.'
            : 'An official government entity of the Kingdom of Saudi Arabia — a leading platform and key engine of digital transformation, built on collective brainpower and artificial intelligence.'}
        </p>
        <p className="entity-slogan">
          {ar ? 'عقول مبتكرة.. لحلول متكاملة ومؤتمتة' : 'Innovative minds.. for integrated, automated solutions'}
        </p>
        <div className="entity-grid">
          <div className="entity-card">
            <h3>{ar ? 'رؤيتنا' : 'Vision'}</h3>
            <p>
              {ar
                ? 'أن نكون الوجهة المرجعية الأولى والكيان الحكومي الأبرز في المملكة لتسخير التكنولوجيا المدمجة والذكاء الاصطناعي؛ لبناء مستقبل رقمي مستدام يعزز جودة الحياة وكفاءة الأعمال.'
                : 'To be the Kingdom\'s premier government entity harnessing integrated technology and AI to build a sustainable digital future that raises quality of life and business efficiency.'}
            </p>
          </div>
          <div className="entity-card">
            <h3>{ar ? 'رسالتنا' : 'Mission'}</h3>
            <p>
              {ar
                ? 'تمكين القطاعات الحيوية عبر حلول متطورة ترتكز على ثلاثة محاور: الأتمتة، التكامل، والقيادة التقنية — لتسريع عجلة الابتكار وريادة الأعمال.'
                : 'Empower vital sectors through advanced solutions built on three pillars: automation, integration, and technology leadership — accelerating innovation and entrepreneurship.'}
            </p>
          </div>
          <div className="entity-card">
            <h3>{ar ? 'أنظمة مؤتمتة' : 'Automated Systems'}</h3>
            <p>
              {ar
                ? 'بنى تحتية ذكية تقلل التدخل البشري وترفع دقة وسرعة الإنجاز في العمليات المعقدة.'
                : 'Smart infrastructure that reduces human intervention and raises the accuracy and speed of complex operations.'}
            </p>
          </div>
          <div className="entity-card">
            <h3>{ar ? 'حلول متكاملة' : 'Integrated Solutions'}</h3>
            <p>
              {ar
                ? 'بيئة رقمية مترابطة تضمن التدفق السلس للبيانات بين القطاعات الحكومية والخاصة.'
                : 'An interconnected digital environment ensuring seamless data flow across public and private sectors.'}
            </p>
          </div>
          <div className="entity-card">
            <h3>{ar ? 'قيادة تكنولوجية' : 'Technology-Driven'}</h3>
            <p>
              {ar
                ? 'الاستثمار في أحدث ما توصل إليه العلم في الذكاء الاصطناعي والتقنيات الناشئة لتوفير استراتيجيات استباقية.'
                : 'Investing in the latest advances in AI and emerging technologies to deliver proactive strategies.'}
            </p>
          </div>
        </div>
        <div className="entity-sectors">
          {[
            { n: '١', t: ar ? 'الرعاية الصحية' : 'Healthcare', d: ar ? 'تحسين جودة الخدمات الطبية وتطوير حلول الصحة الرقمية' : 'Better medical services and digital health solutions' },
            { n: '٢', t: ar ? 'الأعمال والريادة' : 'Business & Entrepreneurship', d: ar ? 'دعم الشركات الناشئة ورواد الأعمال بأدوات تقنية تنافسية' : 'Supporting startups and founders with competitive tech tools' },
            { n: '٣', t: ar ? 'الابتكار التقني' : 'Tech Innovation', d: ar ? 'تمكين المبادرات التقنية للتحول الرقمي الحكومي والمؤسسي' : 'Enabling tech initiatives for government and institutional transformation' },
          ].map(s => (
            <span className="entity-sector" key={s.n}><b>{s.n}</b> <b>{s.t}</b> — {s.d}</span>
          ))}
        </div>
      </section>

      <section className="stages">
        {cat.stages.map((s, i) => {
          const Icon = ICONS[i] || BookOpen;
          return (
            <Link key={s.id} to={s.route} className={`stage-card ${ACCENTS[i] || ''}`}>
              <span className="stage-icon"><Icon size={24} strokeWidth={2.2} /></span>
              <h2>
                {ar ? s.ar : s.en}
                {s.id === 'build' && <span> <Sparkles size={20} style={{ verticalAlign: 'text-bottom' }} /></span>}
              </h2>
              <p>{ar ? s.blurbAr : s.blurbEn}</p>
              <span className="stage-count" data-suffix={ar ? 'عنواناً' : 'titles'}>{counts[s.id]}</span>
              <ArrowLeft size={18} className="stage-arrow" />
            </Link>
          );
        })}
      </section>

      <section>
        <div className="section-head reveal">
          <h2>{ar ? 'مميز' : 'Featured'}</h2>
          <Link className="button secondary sm" to="/learn">{t('nav.all')}</Link>
        </div>
        <div className="grid reveal">
          {featured.map(p => <ProductCard key={p.slug} p={p} />)}
        </div>
      </section>

      <section className="program-teaser reveal">
        <h2>{ar ? cat.build.program.nameAr : cat.build.program.name}</h2>
        <p>{ar ? cat.build.program.taglineAr : cat.build.program.tagline}</p>
        <strong>{money(cat.build.program.price, ar)}</strong>
        <Link className="button primary" to="/build">{t('cta.apply')}</Link>
      </section>
    </main>
  );
}
