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

      <section className="entity second-brain reveal">
        <span className="hero-eyebrow"><span className="dot gold" /> {ar ? 'العقل الثاني' : 'The Second Brain'}</span>
        <div className="entity-mark">🧠</div>
        <h2 className="entity-abbr">{ar ? 'عقل ثانٍ كامل لك' : 'A complete brain — yours'}</h2>
        <p className="entity-official">
          {ar
            ? 'إذا كانت القصة قابلة للتصديق، فالمنتج قابل للبيع. العقل الثاني هو قصتنا التي نؤمن بها: هدية متكاملة لمن يبنون معنا — 16 يوماً، 16 مختبراً، 16 معلم إنجاز، وكلها مترابطة في Notion.'
            : 'If the story is believable, the product will sell. The Second Brain is our story — a complete gift for those who build with us: 16 days, 16 labs, 16 milestones, all woven together in Notion.'}
        </p>
        <p className="entity-slogan">
          {ar
            ? 'العقل الثاني دليل منّا أنك استخدمت عقلك الأول جيداً.. ولهذا وصلت إلى هنا.'
            : 'The Second Brain is our proof that you used your first one very well — and that is exactly why you are here.'}
        </p>
        <div className="entity-grid">
          <div className="entity-card">
            <h3>{ar ? '١٦ يوماً' : '16 days'}</h3>
            <p>
              {ar
                ? 'مسار كامل: من الإشعال واختيار الفكرة إلى التخرج والعرض. كل يوم عنوان واضح ومختبر عملي ملحق به.'
                : 'A full path: from ignition and idea selection to graduation and the final pitch. Every day has a clear title and a hands-on lab.'}
            </p>
          </div>
          <div className="entity-card">
            <h3>{ar ? '١٦ مختبراً' : '16 labs'}</h3>
            <p>
              {ar
                ? 'مختبرات حقيقية خطوة بخطوة: متجر، دفع، تسليم آلي، تحليلات، أمان، ذكاء اصطناعي، وأكثر.'
                : 'Real step-by-step labs: store, payments, automated delivery, analytics, security, AI, and more.'}
            </p>
          </div>
          <div className="entity-card">
            <h3>{ar ? '١٦ معلم إنجاز' : '16 milestones'}</h3>
            <p>
              {ar
                ? 'معالم مسجلة لك في Notion — كل يوم ترفع حالتك من Not Started إلى Completed وتضع دليل إنجازك.'
                : 'Milestones recorded for you in Notion — every day you move from Not Started to Completed with proof of delivery.'}
            </p>
          </div>
          <div className="entity-card">
            <h3>{ar ? 'مستودع GitHub' : 'Your GitHub repo'}</h3>
            <p>
              {ar
                ? 'بعد الدفع يولَّد مستودعك الخاص من قالب BUILD — تبدأ من مرجع تملكه وتعمل عليه كمساهم.'
                : 'After payment your own repo is generated from the BUILD starter — you start from a reference you own and work on it as a collaborator.'}
            </p>
          </div>
          <div className="entity-card">
            <h3>{ar ? 'شهادة إتمام' : 'Completion certificate'}</h3>
            <p>
              {ar
                ? 'شهادة رقمية تُصدر تلقائياً عند اكتمال المعالم — دليل أنك أنهيت ما بدأته.'
                : 'A digital certificate issued automatically once your milestones are complete — proof you finished what you started.'}
            </p>
          </div>
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
