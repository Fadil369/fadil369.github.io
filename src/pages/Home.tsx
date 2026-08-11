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
