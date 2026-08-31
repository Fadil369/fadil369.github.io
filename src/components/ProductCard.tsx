import { Link } from 'react-router-dom';
import { ExternalLink, ArrowLeft, ArrowRight, Star } from 'lucide-react';
import type { Product } from '../types';
import { useI18n, money } from '../i18n';
import { track } from '../analytics';
import { useAccountHolder } from '../hooks/useAccountHolder';
import { withUtm } from '../lib/shopifyRouting';

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
  const isMonthly = (p.billingEn || '').toLowerCase() === 'monthly';
  const isLearn = p.stage === 'learn';
  const isSolutions = p.stage === 'solutions';
  const hasMonthlyUrl = Boolean(p.shopifyUrlMonthly);
  const hasReadyUrl = Boolean(p.shopifyUrl);
  const hasOneTimeUrl = Boolean(p.shopifyUrlOneTime);
  const periodLabel = isMonthly && !isLearn ? (ar ? '/شهر' : '/mo') : '';
  const ctaLabel = isMonthly ? (ar ? 'اشترك' : 'Subscribe') : (freeForYou ? t('cta.getFree') : t('cta.buy'));

  const onBuy = () =>
    track('add_to_cart', {
      currency: 'SAR',
      value: p.price,
      items: [{ item_id: p.slug, item_name: p.name, price: p.price }],
    });
  const onDemoCb = () => track('view_demo', { item_id: p.slug, item_name: p.name });
  const onFree = () => track('add_to_cart', { currency: 'SAR', value: 0, items: [{ item_id: p.slug, item_name: p.name, price: 0 }] });
  const Arrow = ar ? ArrowRight : ArrowLeft;

  return (
    <article className="pcard">
      <div className="pcard-cover">
        <Link to={`/products/${p.slug}`} className="pcard-cover-link" aria-label={name}>
          {p.image
            ? <img src={p.image} alt={name} loading="lazy" width={320} height={480} />
            : <div className="pcard-cover-fallback" aria-hidden="true">{name.slice(0, 1)}</div>}
        </Link>
        <div className="pcard-badges" aria-hidden="true" style={{ position: 'absolute', inset: 8, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className={`pcard-badge comm comm-${commercial}`}>{commBadge} {commLabel}</span>
              {freeForYou && <span className="pcard-badge pcard-badge-free">{t('free')}</span>}
            </span>
            {p.flag === 'demo' && <span className="pcard-badge">{t('demo')}</span>}
          </div>
          {fmt && <div style={{ alignSelf: 'flex-end' }}><span className="pcard-badge pcard-format">{fmt}</span></div>}
        </div>
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
          <span className="pcard-price">
            {isLearn
              ? `${money(freeForYou ? 0 : (p.price ?? 182), ar)} · ${ar ? 'شهري' : 'Monthly'}`
              : isSolutions && hasReadyUrl
                ? (p.price != null && p.price >= 20000
                    ? (ar ? 'جاهز — دفع كامل' : 'Pre-built — one-time')
                    : (ar ? 'شهري + جاهز' : 'Monthly + Ready'))
                : money(freeForYou ? 0 : (p.price ?? 0), ar) + periodLabel}
          </span>
          <div className="pcard-cta">
            {isSolutions ? (
              <>
                {hasMonthlyUrl && (
                  <a className="button primary sm" href={withUtm(p.shopifyUrlMonthly!)}
                     target="_blank" rel="noopener noreferrer" onClick={onBuy}
                     aria-label={ar ? 'اشترك شهرياً' : 'Subscribe monthly'}>
                    {ar ? 'اشترك شهرياً' : 'Subscribe'} <ExternalLink size={14} aria-hidden="true" />
                  </a>
                )}
                {hasReadyUrl && (
                  <a className="button primary sm" href={withUtm(p.shopifyUrl!)}
                     target="_blank" rel="noopener noreferrer" onClick={onBuy}
                     aria-label={ar ? 'احصل على نسخة جاهزة' : 'Get pre-built'}>
                    {ar ? 'جاهز الآن' : 'Pre-built'} <ExternalLink size={14} aria-hidden="true" />
                  </a>
                )}
                {p.demoUrl && (
                  <a className="button ghost sm" href={withUtm(p.demoUrl)}
                     target="_blank" rel="noopener noreferrer" onClick={onDemoCb}
                     aria-label={ar ? 'عرض مباشر' : 'Live demo'}>
                    {ar ? 'عرض مباشر' : 'Demo'} <ExternalLink size={14} aria-hidden="true" />
                  </a>
                )}
              </>
            ) : buyable ? (
              freeForYou ? (
                <Link className="button primary sm" to={`/products/${p.slug}`} onClick={onFree}>
                  {t('cta.getFree')} <Arrow size={14} aria-hidden="true" />
                </Link>
              ) : (
                <>
                <a className="button primary sm" href={withUtm(p.shopifyUrl!)}
                   target="_blank" rel="noopener noreferrer" onClick={onBuy}>
                  {isLearn ? (ar ? 'اشترك شهرياً' : 'Subscribe monthly') : ctaLabel} <ExternalLink size={14} aria-hidden="true" />
                </a>
                {isLearn && hasOneTimeUrl && (
                  <a className="button secondary sm" href={withUtm(p.shopifyUrlOneTime!)}
                     target="_blank" rel="noopener noreferrer" onClick={onBuy}
                     aria-label={ar ? 'اشترِ الكتاب (مرة واحدة)' : 'Buy this book (one-time)'}>
                    {ar ? 'اشترِ الكتاب' : 'Buy book'} <ExternalLink size={14} aria-hidden="true" />
                  </a>
                )}
                </>
              )
            ) : p.demoUrl ? (
              <a className="button primary sm" href={withUtm(p.demoUrl)}
                 target="_blank" rel="noopener noreferrer" onClick={onDemoCb}>
                {commercial === 'service' ? (ar ? 'احجز الجلسة' : 'Book session') : t('cta.demo')}
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            ) : (
              <Link className="button primary sm" to={`/products/${p.slug}`} onClick={onBuy}>
                {ar ? 'اطلب' : 'Request'} <Arrow size={14} aria-hidden="true" />
              </Link>
            )}
            <Link className="button secondary sm" to={`/products/${p.slug}`}>
              {isLearn ? (ar ? 'اعرف المزيد' : 'Learn more') : t('cta.details')} <Arrow size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
