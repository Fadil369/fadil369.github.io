import { Link } from 'react-router-dom';
import { ExternalLink, ArrowLeft, Star } from 'lucide-react';
import type { Product } from '../types';
import { useI18n, money } from '../i18n';
import { track } from '../analytics';
import { useAccountHolder } from '../hooks/useAccountHolder';

/** Derive a small format/type chip from the product name (bilingual). */
function formatLabel(name: string, ar: boolean): string | null {
  const n = name.toLowerCase();
  if (n.includes('mini-book')) return ar ? 'كتاب مصغر' : 'Mini-Book';
  if (n.includes('notebook') || n.includes('notebook')) return ar ? 'دفتر' : 'Notebook';
  if (n.includes('(drive edition)')) return ar ? 'نسخة PDF' : 'PDF Edition';
  if (n.includes('course')) return ar ? 'دورة' : 'Course';
  if (n.includes('license')) return ar ? 'رخصة' : 'License';
  if (n.includes('platform')) return ar ? 'منصة' : 'Platform';
  if (n.includes('masterclass')) return ar ? 'ماستركلاس' : 'Masterclass';
  if (n.includes('suite')) return ar ? 'حزمة' : 'Suite';
  if (n.includes('bundle')) return ar ? 'حزمة' : 'Bundle';
  if (n.includes('novel')) return ar ? 'رواية' : 'Novel';
  if (n.includes('blueprint')) return ar ? 'مخطط' : 'Blueprint';
  if (n.includes('template')) return ar ? 'قالب' : 'Template';
  if (n.includes('agent')) return ar ? 'وكيل' : 'Agent';
  return null;
}

/**
 * Product card — enhanced representation:
 * category eyebrow + format chip, clamped bilingual title,
 * specific tagline with fade, star rating, benefit snippet,
 * and a clean commerce footer.
 */
export default function ProductCard({ p }: { p: Product }) {
  const { ar, t } = useI18n();
  const accountHolder = useAccountHolder();
  const name = ar ? p.nameAr || p.name : p.name;
  const tagline = ar ? p.taglineAr || p.tagline : p.tagline;
  const buyable = Boolean(p.shopifyUrl);
  const freeForYou = accountHolder === true;
  const commercial = p.commercial || (p.demoUrl ? 'demo' : 'product');
  const commBadge = commercial === 'product' ? '🛒' : commercial === 'service' ? '💰' : '🧩';
  const commLabel = commercial === 'product' ? (ar ? 'منتج' : 'Product')
    : commercial === 'service' ? (ar ? 'خدمة' : 'Service') : (ar ? 'عرض' : 'Demo');
  const fmt = formatLabel(p.name, ar);
  const benefit = p.benefits?.[0];

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
        {fmt && <span className="pcard-badge pcard-format">{fmt}</span>}
        <span className={`pcard-badge comm comm-${commercial}`}>{commBadge} {commLabel}</span>
        {freeForYou && <span className="pcard-badge pcard-badge-free">{t('free')}</span>}
      </div>

      <div className="pcard-body">
        <div className="pcard-meta">
          <span className="pcard-eyebrow">
            {ar ? p.categoryAr || p.category : p.category}
          </span>
          {p.rating != null && p.rating > 0 && (
            <span className="pcard-rating" title={`${p.rating}/5`}>
              <Star size={11} fill="currentColor" />
              {Number(p.rating).toFixed(1)}
            </span>
          )}
        </div>

        <h3 className="pcard-title">
          <Link to={`/products/${p.slug}`}>{name}</Link>
        </h3>

        {tagline && <p className="pcard-prop">{tagline}</p>}
        {benefit && <p className="pcard-benefit">{benefit}</p>}

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
                {commercial === 'service' ? (ar ? 'احجز الجلسة' : 'Book session') : t('cta.demo')}
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            ) : (
              <Link className="button primary sm" to={`/products/${p.slug}`} onClick={onBuy}>
                {ar ? 'اطلب' : 'Request'} <ArrowLeft size={14} aria-hidden="true" />
              </Link>
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
