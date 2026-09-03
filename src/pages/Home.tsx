import { Link } from 'react-router-dom';
import { BookOpen, Hammer, Boxes, ArrowLeft, Sparkles } from 'lucide-react';
import data from '../data/catalog.json';
import type { Catalog } from '../types';
import { useI18n, money } from '../i18n';
import ProductCard from '../components/ProductCard';
import BenefitsMatrix from '../components/BenefitsMatrix';
import JourneyFlow from '../components/JourneyFlow';
import { usePageMeta } from '../hooks/usePageMeta';

const cat = data as unknown as Catalog;
const ICONS = [BookOpen, Hammer, Boxes];
const ACCENTS = ['learn', 'build', 'solutions'];

export default function Home() {
  const { ar, t } = useI18n();
  const bpr = cat.solutions.find(p => p.slug === 'bpr');
  const featured = bpr ? [bpr, ...cat.learn.slice(0, 7)] : cat.learn.slice(0, 8);
  const counts: Record<string, number> = {
    learn: cat.learn.length,
    build: cat.build.courses.length + 1,
    solutions: cat.solutions.length,
  };

  usePageMeta({
    title: ar ? 'متجر BrainSAIT — تعلّم · ابنِ · حلول' : 'BrainSAIT Store — Learn · Build · Solutions',
    description: 'BrainSAIT Store — Learn, Build, Solutions. Books, courses, incubation program and live software for healthcare, business and development.',
    url: '/',
    type: 'website',
  });

  return (
    <main className="page">
      <section className="hero reveal">
        <span className="hero-eyebrow"><span className="dot" /> {ar ? 'متجر برينسايت الفاخر' : 'The BrainSAIT Luxury Store'}</span>
        <h1>{ar ? 'تعلّم · ابنِ · حلول' : 'Learn · Build · Solutions'}</h1>
        <p className="lede">
          {ar
            ? '40 بطاقة تعلّم، 16 مسار بناء، وأكثر من 37 عرضاً حياً للحلول — كلها متصلة بمتجر Shopify نفسه، مع دفع واضح وتسليم وأتمتة بعد الشراء.'
            : '40 learning cards, 16 build paths, and 37+ live solution demos — all connected to the same Shopify store, with clear checkout, delivery, and post-purchase automation.'}
        </p>
        <div className="build-launch-strip" style={{ justifyContent: 'center' }}>
          <span className="launch-tag">{ar ? 'مسارات المتجر' : 'Store paths'}</span>
          <span className="launch-now">{ar ? 'LEARN 182 ر.س/شهر' : 'LEARN 182 SAR/mo'}</span>
          <span className="launch-now">{ar ? 'BUILD شهري أو 9,630 ر.س' : 'BUILD monthly or 9,630 SAR'}</span>
          <span className="launch-now">{ar ? 'SOLUTION 24,000 ر.س' : 'SOLUTION 24,000 SAR'}</span>
          <span className="launch-now">{ar ? 'BPR 163/3,960 ر.س' : 'BPR 163/3,960 SAR'}</span>
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

      <BenefitsMatrix />

      <JourneyFlow />

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
