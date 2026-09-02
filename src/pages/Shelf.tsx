import { useMemo, useState } from 'react';
import data from '../data/catalog.json';
import type { Catalog, Product, Stage } from '../types';
import { useI18n } from '../i18n';
import ProductCard from '../components/ProductCard';
import { usePageMeta } from '../hooks/usePageMeta';
import { GHIO_LINKS, withUtm } from '../lib/shopifyRouting';

const cat = data as unknown as Catalog;

/** Learn and Solutions shelves, filtered by sub-category. */
export default function Shelf({ stage }: { stage: Exclude<Stage, 'build'> }) {
  const { ar, t } = useI18n();
  const def = cat.stages.find(s => s.id === stage)!;
  const [sub, setSub] = useState('all');
  const [comm, setComm] = useState('all');
  const items: Product[] = stage === 'learn' ? cat.learn : cat.solutions;

  usePageMeta({
    title: ar ? `${def.ar} — BrainSAIT Store` : `${def.en} — BrainSAIT Store`,
    description: ar ? def.blurbAr : def.blurbEn,
    url: `/${def.id}`,
    type: 'website',
  });

  const subs = useMemo(() => {
    const present = new Set(items.map(i => i.sub));
    return cat.subcategories.filter(s => present.has(s.id));
  }, [items]);

  const shown = items.filter(i => (sub === 'all' || i.sub === sub) && (comm === 'all' || (i.commercial || 'demo') === comm));

  return (
    <main className="page">
      <header className="page-head reveal">
        <h1>{ar ? def.ar : def.en}</h1>
        <p className="lede">{ar ? def.blurbAr : def.blurbEn}</p>
      </header>

      {stage === 'learn' && (
        <section className="shelf-plan-banner reveal" aria-label={ar ? 'خطة تعلم الشهرية' : 'LEARN monthly plan'}>
          <div>
            <span className="hero-eyebrow"><span className="dot" /> {ar ? 'وصول كامل' : 'Complete access'}</span>
            <h2>{ar ? 'كل كتب LEARN الأربعين — رابط واحد' : 'All 40 LEARN books — one link'}</h2>
            <p>{ar ? 'اقرأ المجموعة كاملة أونلاين مع تجديد شهري وتذكيرات قبل الاستحقاق.' : 'Read the complete collection online, with monthly renewal tracking and payment reminders.'}</p>
          </div>
          <a className="button primary lg" href={withUtm(GHIO_LINKS.learnMonthly, { plan: 'learn-monthly', utm_content: 'learn-banner' })} target="_blank" rel="noopener noreferrer">
            {ar ? 'اشترك بـ 182 ريال/شهر' : 'Subscribe · 182 SAR/month'}
          </a>
        </section>
      )}

      {stage === 'solutions' && (
        <section className="shelf-plan-banner solutions-banner reveal" aria-label={ar ? 'خيارات الحلول' : 'Solution plans'}>
          <div>
            <span className="hero-eyebrow"><span className="dot" /> {ar ? 'مساران للتنفيذ' : 'Two delivery paths'}</span>
            <h2>{ar ? 'احتضان شهري أو حل جاهز للنشر' : 'Monthly incubation or deployment-ready'}</h2>
            <p>{ar ? 'اختر 1,999 ريال شهرياً للشراكة الكاملة، أو 24,000 ريال لحل جاهز مع جلسة إعداد.' : 'Choose 1,999 SAR/month for the full partner journey, or 24,000 SAR for a ready solution with an infrastructure kickoff.'}</p>
            {/* Both Solutions plans include the code platform — say so up front, matching
                what the backend actually provisions (reserved *.code.brainsait.org workspace). */}
            <p className="shelf-code-access">
              <span aria-hidden="true">💻</span>{' '}
              {ar ? 'كلا الخطتين تشملان ' : 'Both plans include '}
              <a href="https://code.brainsait.org" target="_blank" rel="noopener noreferrer">
                {ar ? 'منصة BrainSAIT Code' : 'BrainSAIT Code platform access'}
              </a>{' '}
              {ar ? '— مساحة عمل محجوزة على code.brainsait.org مع بيئة البناء بالذكاء الاصطناعي.' : '— a reserved workspace on code.brainsait.org with the AI build environment.'}
            </p>
          </div>
        </section>
      )}

      <div className="filters reveal" role="tablist">
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

      {stage === 'solutions' && (
        <div className="filters reveal comm-filters" role="tablist" aria-label="Commercial type">
          {[['all', ar ? 'الكل' : 'All'], ['product', '🛒 ' + (ar ? 'منتجات' : 'Products')],
            ['demo', '🧩 ' + (ar ? 'عروض' : 'Demos')], ['service', '💰 ' + (ar ? 'خدمات' : 'Services')]]
            .map(([v, label]) => (
              <button role="tab" key={v} aria-selected={comm === v}
                      className={'chip' + (comm === v ? ' active' : '')}
                      onClick={() => setComm(v)}>
                {label}
              </button>
            ))}
        </div>
      )}

      <div className="grid reveal">
        {shown.map(p => <ProductCard key={p.slug} p={p} />)}
      </div>
    </main>
  );
}
