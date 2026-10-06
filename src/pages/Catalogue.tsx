import { useMemo, useState } from 'react';
import data from '../data/catalogLive';
import type { Catalog, Product } from '../types';
import { useI18n } from '../i18n';
import ProductCard from '../components/ProductCard';
import { usePageMeta } from '../hooks/usePageMeta';

const cat = data as unknown as Catalog;

/**
 * Store catalogue — every product the canonical WooCommerce store sells that no
 * editorial stage claims yet.
 *
 * The grouping is the store's own category, never an invented tier. Nothing
 * here claims these products belong to Learn, Build, Solutions, Templates or
 * OID; when one earns a stage it graduates out of this page unchanged.
 */
export default function Catalogue() {
  const { ar } = useI18n();
  const items = (cat.catalogue ?? []) as Product[];
  const [group, setGroup] = useState('all');

  usePageMeta({
    title: ar ? 'كتالوج المتجر — BrainSAIT' : 'Store Catalogue — BrainSAIT',
    description: ar
      ? 'كل منتجات متجر BrainSAIT التي لم تُنشر بعد ضمن مرحلة تحريرية، مجمّعة حسب تصنيف المتجر.'
      : 'Everything the BrainSAIT store sells that is not yet placed in an editorial stage, grouped by store category.',
    url: '/catalogue',
    type: 'website',
  });

  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const key = item.category || 'Uncategorised';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const shown = group === 'all' ? items : items.filter(i => (i.category || 'Uncategorised') === group);

  return (
    <main className="page">
      <header className="page-head reveal">
        <h1>{ar ? 'كتالوج المتجر' : 'Store Catalogue'}</h1>
        <p className="lede">
          {ar
            ? `${items.length} منتجاً متاحاً للشراء الآن، مجمّعة حسب تصنيف المتجر.`
            : `${items.length} products, available to buy now, grouped by store category.`}
        </p>
        <p className="muted" style={{ maxWidth: '54ch', margin: '0 auto' }}>
          {ar
            ? 'هذه المنتجات لم تُنشر بعد ضمن مرحلة تحريرية، لذلك لم تُصنَّف. التصنيف أدناه هو تصنيف المتجر نفسه، لا تصنيف تحريري.'
            : 'These have not been placed in an editorial stage, so none is claimed for them. The grouping below is the store’s own category, not an editorial tier.'}
        </p>
      </header>

      {groups.length > 1 && (
        <div className="chips reveal" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', margin: '1.5rem 0' }}>
          <button className={group === 'all' ? 'chip on' : 'chip'} onClick={() => setGroup('all')}>
            {ar ? 'الكل' : 'All'} · {items.length}
          </button>
          {groups.map(([name, count]) => (
            <button key={name} className={group === name ? 'chip on' : 'chip'} onClick={() => setGroup(name)}>
              {name} · {count}
            </button>
          ))}
        </div>
      )}

      <div className="grid">
        {shown.map(p => (
          <ProductCard key={p.slug} p={p} />
        ))}
      </div>
    </main>
  );
}