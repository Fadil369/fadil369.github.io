import { useMemo, useState } from 'react';
import data from '../data/catalog.json';
import type { Catalog, Product, Stage } from '../types';
import { useI18n } from '../i18n';
import ProductCard from '../components/ProductCard';

const cat = data as unknown as Catalog;

/** Learn and Solutions shelves, filtered by sub-category. */
export default function Shelf({ stage }: { stage: Exclude<Stage, 'build'> }) {
  const { ar, t } = useI18n();
  const [sub, setSub] = useState('all');
  const items: Product[] = stage === 'learn' ? cat.learn : cat.solutions;

  const subs = useMemo(() => {
    const present = new Set(items.map(i => i.sub));
    return cat.subcategories.filter(s => present.has(s.id));
  }, [items]);

  const shown = sub === 'all' ? items : items.filter(i => i.sub === sub);
  const def = cat.stages.find(s => s.id === stage)!;

  return (
    <main className="page">
      <header className="page-head">
        <h1>{ar ? def.ar : def.en}</h1>
        <p className="lede">{ar ? def.blurbAr : def.blurbEn}</p>
      </header>

      <div className="filters" role="tablist">
        <button role="tab" aria-selected={sub === 'all'}
                className={'chip' + (sub === 'all' ? ' active' : '')}
                onClick={() => setSub('all')}>
          {t('filter.all')} ({items.length})
        </button>
        {subs.map(s => {
          const n = items.filter(i => i.sub === s.id).length;
          return (
            <button role="tab" key={s.id} aria-selected={sub === s.id}
                    className={'chip' + (sub === s.id ? ' active' : '')}
                    onClick={() => setSub(s.id)}>
              {ar ? s.ar : s.en} ({n})
            </button>
          );
        })}
      </div>

      <div className="grid">
        {shown.map(p => <ProductCard key={p.slug} p={p} />)}
      </div>
    </main>
  );
}
