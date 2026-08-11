import { useParams, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { ExternalLink, ShieldCheck, Lock } from 'lucide-react';
import data from '../data/catalog.json';
import type { Catalog, Product as P } from '../types';
import { useI18n, money } from '../i18n';
import { track, trackViewItem } from '../analytics';
import { useAccountHolder } from '../hooks/useAccountHolder';

const cat = data as unknown as Catalog;
const ALL: P[] = [...cat.learn, ...cat.solutions, ...cat.build.courses];

export default function Product() {
  const { slug } = useParams();
  const { ar, t } = useI18n();
  const accountHolder = useAccountHolder();
  const p = ALL.find(x => x.slug === slug);

  useEffect(() => {
    if (p) {
      trackViewItem({ item_id: p.slug, item_name: p.name, item_category: p.category, price: p.price ?? undefined });
    }
  }, [p]);

  if (!p) {
    return (
      <main className="page">
        <h1>{ar ? 'غير موجود' : 'Not found'}</h1>
        <Link className="button secondary" to="/">{ar ? 'العودة' : 'Back'}</Link>
      </main>
    );
  }

  const name = ar ? p.nameAr || p.name : p.name;
  const desc = ar ? p.descriptionAr || p.description : p.description;
  const freeForYou = accountHolder === true;
  const shownPrice = freeForYou ? 0 : p.price;

  const onBuy = () =>
    track('begin_checkout', {
      currency: 'SAR',
      value: p.price,
      items: [{ item_id: p.slug, item_name: p.name, price: p.price }],
    });
  const onDemo = () => track('view_demo', { item_id: p.slug, item_name: p.name });
  const onFree = () => track('begin_checkout', { currency: 'SAR', value: 0, items: [{ item_id: p.slug, item_name: p.name, price: 0 }] });

  return (
    <main className="page product-page">
      <div className="product-grid reveal">
        <div className="product-media">
          {p.image
            ? <img src={p.image} alt={name} width={420} height={630} />
            : <div className="pcard-cover-fallback">{name.slice(0, 1)}</div>}
        </div>
        <div className="product-info">
          <span className="pcard-eyebrow">{ar ? p.categoryAr || p.category : p.category}</span>
          <h1>{name}</h1>
          {desc && <p className="lede">{desc}</p>}

          <p className="product-price">{money(shownPrice, ar)}</p>

          {p.shopifyUrl ? (
            freeForYou ? (
              <>
                <a className="button primary lg" href={p.shopifyUrl}
                   target="_blank" rel="noopener noreferrer" onClick={onFree}>
                  {t('cta.getFree')} <ExternalLink size={16} />
                </a>
                <p className="fineprint">
                  {ar
                    ? '🎓 مجاني لأصحاب الحسابات — مرحلة التعلّم مفتوحة بالكامل'
                    : '🎓 Free for account holders — the Learn stage is fully open'}
                </p>
              </>
            ) : (
              <>
                <a className="button primary lg" href={p.shopifyUrl}
                   target="_blank" rel="noopener noreferrer" onClick={onBuy}>
                  {t('cta.buy')} <ExternalLink size={16} />
                </a>
                <p className="fineprint">
                  <ShieldCheck size={14} /> {t('checkout.note')}
                </p>
              </>
            )
          ) : p.demoUrl ? (
            <>
              <a className="button primary lg" href={p.demoUrl}
                 target="_blank" rel="noopener noreferrer" onClick={onDemo}>
                {t('cta.demo')} <ExternalLink size={16} />
              </a>
              {p.limitedDemo && (
                <p className="fineprint">
                  <Lock size={14} /> {ar ? 'ديمو وصول محدود — يرجى طلب حساب تجريبي' : 'Limited-access demo — request a trial account'}
                </p>
              )}
            </>
          ) : (
            <span className="button disabled lg">{t('cta.soon')}</span>
          )}

          {!!p.benefits?.length && (
            <ul className="benefits">
              {p.benefits.map((b, i) => <li key={i}>{String(b)}</li>)}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
