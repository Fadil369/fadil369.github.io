import { Link } from 'react-router-dom';
import { BookOpen, Hammer, Boxes, ArrowLeft } from 'lucide-react';
import data from '../data/catalog.json';
import type { Catalog } from '../types';
import { useI18n, money } from '../i18n';
import ProductCard from '../components/ProductCard';

const cat = data as unknown as Catalog;
const ICONS = [BookOpen, Hammer, Boxes];

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
      <section className="hero">
        <h1>{ar ? 'تعلّم · ابنِ · حلول' : 'Learn · Build · Solutions'}</h1>
        <p className="lede">
          {ar
            ? 'مكتبة رقمية، برنامج احتضان، وبرمجيات جاهزة — من برينسايت.'
            : 'A digital library, an incubation program, and production-ready software — by BrainSAIT.'}
        </p>
      </section>

      <section className="stages">
        {cat.stages.map((s, i) => {
          const Icon = ICONS[i] || BookOpen;
          return (
            <Link key={s.id} to={s.route} className="stage-card">
              <Icon size={26} />
              <h2>{ar ? s.ar : s.en}</h2>
              <p>{ar ? s.blurbAr : s.blurbEn}</p>
              <span className="stage-count">{counts[s.id]}</span>
              <ArrowLeft size={16} className="stage-arrow" />
            </Link>
          );
        })}
      </section>

      <section>
        <div className="section-head">
          <h2>{ar ? 'مميز' : 'Featured'}</h2>
          <Link className="button secondary sm" to="/learn">{t('nav.all')}</Link>
        </div>
        <div className="grid">
          {featured.map(p => <ProductCard key={p.slug} p={p} />)}
        </div>
      </section>

      <section className="program-teaser">
        <h2>{ar ? cat.build.program.nameAr : cat.build.program.name}</h2>
        <p>{ar ? cat.build.program.taglineAr : cat.build.program.tagline}</p>
        <strong>{money(cat.build.program.price, ar)}</strong>
        <Link className="button primary" to="/build">{t('cta.apply')}</Link>
      </section>
    </main>
  );
}
