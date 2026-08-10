import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, Rocket, Shield, Check } from 'lucide-react';
import data from '../data/catalog.json';
import type { Catalog } from '../types';
import { useI18n, money } from '../i18n';
import ProductCard from '../components/ProductCard';

const cat = data as unknown as Catalog;
import type { LucideIcon } from 'lucide-react';
const ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope, rocket: Rocket, shield: Shield,
};

/**
 * Build stage — the BrainSAIT incubation program.
 * Fixed fee 9,360 SAR, reduced for verified Saudi / Sudanese national IDs.
 * Candidates pick a track and a solution from the Solutions shelf to build.
 */
export default function Build() {
  const { ar, t } = useI18n();
  const { program, courses } = cat.build;
  const [exception, setException] = useState<string>('');
  const [track, setTrack] = useState<string>('');

  const price = useMemo(() => {
    const ex = program.exceptions.find(e => e.id === exception);
    if (!ex) return program.price;
    return Math.round(program.price * (1 - ex.discountPct / 100));
  }, [exception, program]);

  return (
    <main className="page">
      <header className="page-head">
        <h1>{ar ? program.nameAr : program.name}</h1>
        <p className="lede">{ar ? program.taglineAr : program.tagline}</p>
      </header>

      <section className="program">
        <div className="program-price">
          <span className="label">{t('program.price')}</span>
          <strong className={price !== program.price ? 'cut' : ''}>
            {money(program.price, ar)}
          </strong>
          {price !== program.price && (
            <strong className="now">{money(price, ar)}</strong>
          )}
        </div>

        <fieldset className="program-block">
          <legend>{t('program.exceptions')}</legend>
          <label className="opt">
            <input type="radio" name="exc" value="" checked={exception === ''}
                   onChange={() => setException('')} />
            <span>{ar ? 'بدون' : 'None'}</span>
          </label>
          {program.exceptions.map(e => (
            <label className="opt" key={e.id}>
              <input type="radio" name="exc" value={e.id}
                     checked={exception === e.id}
                     onChange={() => setException(e.id)} />
              <span>{ar ? e.labelAr : e.labelEn} — {e.discountPct}%</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="program-block">
          <legend>{t('program.tracks')}</legend>
          <div className="tracks">
            {program.tracks.map(tr => {
              const Icon = ICONS[tr.icon || ''] || Check;
              return (
                <button key={tr.id} type="button"
                        className={'track' + (track === tr.id ? ' active' : '')}
                        onClick={() => setTrack(tr.id)}>
                  <Icon size={20} />
                  <span>{ar ? tr.labelAr : tr.labelEn}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <p className="desc">{ar ? program.descriptionAr : program.description}</p>

        <Link className="button primary" to="/solutions">
          {t('program.pick')}
        </Link>
        <p className="fineprint">{t('checkout.note')}</p>
      </section>

      {courses.length > 0 && (
        <section>
          <h2>{ar ? 'دورات وأدلة' : 'Courses & guides'}</h2>
          <div className="grid">
            {courses.map(c => <ProductCard key={c.slug} p={c} />)}
          </div>
        </section>
      )}
    </main>
  );
}
