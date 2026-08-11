import { Link } from 'react-router-dom';
import { ExternalLink, ArrowLeft } from 'lucide-react';
import type { Product } from '../types';
import { useI18n, money } from '../i18n';
import { track } from '../analytics';
import { useAccountHolder } from '../hooks/useAccountHolder';

/**
 * Product card — visual system preserved from the original store:
 * 2:3 book-shaped cover, 22px radius, border + shadow, clamped title.
 *
 * Commerce: the primary CTA links straight to the live Shopify product page,
 * where checkout completes with PayPal. No WhatsApp ordering.
 */
export default function ProductCard({ p }: { p: Product }) {
  const { ar, t } = useI18n();
  const accountHolder = useAccountHolder();
  const name = ar ? p.nameAr || p.name : p.name;
  const tagline = ar ? p.taglineAr || p.tagline : p.tagline;
  const buyable = Boolean(p.shopifyUrl);
  const freeForYou = accountHolder === true;

  const onBuy = () =>
    track('add_to_cart', {
      currency: 'SAR',
      value: p.price,
      items: [{ item_id: p.slug, item_name: p.name, price: p.price }],
    });
  const onDemo = () => track('view_demo', { item_id: p.slug, item_name: p.name });
  const onFree = () => track('add_to_cart', { currency: 'SAR', value: 0, items: [{ item_id: p.slug, item_name: p.name, price: 0 }] });

  return (
    <article className="pcard">
      <div className="pcard-cover">
        <Link to={`/products/${p.slug}`} className="pcard-cover-link" aria-label={name}>
          {p.image
            ? <img src={p.image} alt={name} loading="lazy" width={320} height={480} />
            : <div className="pcard-cover-fallback" aria-hidden="true">{name.slice(0, 1)}</div>}
        </Link>
        {p.flag === 'demo' && <span className="pcard-badge">{t('demo')}</span>}
        {freeForYou && <span className="pcard-badge pcard-badge-free">{t('free')}</span>}
      </div>

      <div className="pcard-body">
        <span className="pcard-eyebrow">
          {ar ? p.categoryAr || p.category : p.category}
        </span>
        <h3 className="pcard-title">
          <Link to={`/products/${p.slug}`}>{name}</Link>
        </h3>
        {tagline && <p className="pcard-prop">{tagline}</p>}

        <div className="pcard-foot">
          <span className="pcard-price">{money(freeForYou ? 0 : p.price, ar)}</span>
          <div className="pcard-cta">
            {buyable ? (
              freeForYou ? (
                <Link className="button primary sm" to={`/products/${p.slug}`} onClick={onFree}>
                  {t('cta.getFree')} <ArrowLeft size={14} aria-hidden="true" />
                </Link>
              ) : (
                <a className="button primary sm" href={p.shopifyUrl!}
                   target="_blank" rel="noopener noreferrer" onClick={onBuy}>
                  {t('cta.buy')} <ExternalLink size={14} aria-hidden="true" />
                </a>
              )
            ) : p.demoUrl ? (
              <a className="button primary sm" href={p.demoUrl}
                 target="_blank" rel="noopener noreferrer" onClick={onDemo}>
                {t('cta.demo')} <ExternalLink size={14} aria-hidden="true" />
              </a>
            ) : (
              <span className="button disabled sm">{t('cta.soon')}</span>
            )}
            <Link className="button secondary sm" to={`/products/${p.slug}`}>
              {t('cta.details')} <ArrowLeft size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

