import { useParams, Link } from 'react-router-dom';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import data from '../data/catalog.json';
import type { Catalog, Product as P } from '../types';
import { useI18n, money } from '../i18n';

const cat = data as unknown as Catalog;
const ALL: P[] = [...cat.learn, ...cat.solutions, ...cat.build.courses];

export default function Product() {
  const { slug } = useParams();
  const { ar, t } = useI18n();
  const p = ALL.find(x => x.slug === slug);

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

          <p className="product-price">{money(p.price, ar)}</p>

          {p.shopifyUrl ? (
            <>
              <a className="button primary lg" href={p.shopifyUrl}
                 target="_blank" rel="noopener noreferrer">
                {t('cta.buy')} <ExternalLink size={16} />
              </a>
              <p className="fineprint">
                <ShieldCheck size={14} /> {t('checkout.note')}
              </p>
            </>
          ) : p.demoUrl ? (
            <a className="button primary lg" href={p.demoUrl}
               target="_blank" rel="noopener noreferrer">
              {t('cta.demo')} <ExternalLink size={16} />
            </a>
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
