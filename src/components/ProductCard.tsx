import { Link } from 'react-router-dom';
import { ExternalLink, ArrowLeft, ArrowRight, Star } from 'lucide-react';
import type { Product } from '../types';
import { useI18n, money } from '../i18n';
import { track } from '../analytics';
import { useAccountHolder } from '../hooks/useAccountHolder';
import { GHIO_LINKS, withUtm } from '../lib/shopifyRouting';

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
  const commBadge = commercial === 'product' ? '🛒' : commercial === 'service' ? '💰' : commercial === 'saas' ? '◎' : '🧩';
  const commLabel = commercial === 'product' ? (ar ? 'منتج' : 'Product')
    : commercial === 'service' ? (ar ? 'خدمة' : 'Service')
      : commercial === 'saas' ? (ar ? 'عضوية' : 'Membership') : (ar ? 'عرض' : 'Demo');
  const fmt = formatLabel(p.name, ar);
  const benefit = p.benefits?.[0];
  const isMonthly = (p.billingEn || '').toLowerCase() === 'monthly';
  const isLearn = p.stage === 'learn';
  const isSolutions = p.stage === 'solutions';
  const hasMonthlyUrl = Boolean(p.shopifyUrlMonthly);
  const readyUrl = GHIO_LINKS.solutionReadyProduct;
  const periodLabel = isMonthly && !isLearn ? (ar ? '/شهر' : '/mo') : '';
  const isBpr = p.slug === 'bpr';
  const ctaLabel = isMonthly || isBpr ? (ar ? 'اشترك' : 'Subscribe') : (freeForYou ? t('cta.getFree') : t('cta.buy'));
  const learnMoreLabel = isLearn ? (ar ? 'اعرف المزيد' : 'Learn more') : t('cta.details');

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
            {isBpr
              ? (ar ? 'سنوي 3,960 · شهري 163' : 'Annual 3,960 · Monthly 163')
              : isLearn
                ? (ar ? 'شراء فردي · أو 182 ريال/شهر' : 'Buy individually · or 182 SAR/mo')
              : isSolutions
                ? (ar ? '1,999 شهرياً · 24,000 جاهز' : '1,999/mo · 24,000 ready')
                : money(freeForYou ? 0 : (p.price ?? 0), ar) + periodLabel}
          </span>
          <div className="pcard-cta">
            {isBpr ? (
              <>
                <a className="button primary sm" href={withUtm(GHIO_LINKS.bpr, { utm_content: p.slug, plan: 'bpr-annual' })}
                   target="_blank" rel="noopener noreferrer" onClick={onBuy}>
                  {ar ? 'سنوي' : 'Annual'} <ExternalLink size={14} aria-hidden="true" />
                </a>
                <Link className="button secondary sm" to={`/products/${p.slug}`}>
                  {learnMoreLabel} <Arrow size={14} aria-hidden="true" />
                </Link>
              </>
            ) : isSolutions ? (
              <>
                {hasMonthlyUrl && (
                  <a className="button primary sm" href={withUtm(p.shopifyUrlMonthly!, { utm_content: p.slug, plan: 'solution-monthly' })}
                     target="_blank" rel="noopener noreferrer" onClick={onBuy}
                     aria-label={ar ? 'اشترك شهرياً' : 'Subscribe monthly'}>
                    {ar ? 'اشترك شهرياً' : 'Subscribe'} <ExternalLink size={14} aria-hidden="true" />
                  </a>
                )}
                <a className="button secondary sm" href={withUtm(readyUrl, { utm_content: p.slug, plan: 'solution-ready' })}
                     target="_blank" rel="noopener noreferrer" onClick={onBuy}
                     aria-label={ar ? 'احصل على نسخة جاهزة' : 'Get pre-built'}>
                    {ar ? 'جاهز · 24 ألف' : 'Ready · 24k'} <ExternalLink size={14} aria-hidden="true" />
                </a>
              </>
            ) : buyable ? (
              isLearn ? (
                <a className="button primary sm" href={withUtm(GHIO_LINKS.learnMonthly, { utm_content: p.slug, plan: 'learn-monthly' })}
                   target="_blank" rel="noopener noreferrer" onClick={onBuy}>
                  {ar ? 'اشترك · 182 ريال' : 'Subscribe · 182 SAR'} <ExternalLink size={14} aria-hidden="true" />
                </a>
              ) : freeForYou ? (
                <Link className="button primary sm" to={`/products/${p.slug}`} onClick={onFree}>
                  {t('cta.getFree')} <Arrow size={14} aria-hidden="true" />
                </Link>
              ) : (
                <a className="button primary sm" href={withUtm(p.shopifyUrl!, { utm_content: p.slug })}
                   target="_blank" rel="noopener noreferrer" onClick={onBuy}>
                  {ctaLabel} <ExternalLink size={14} aria-hidden="true" />
                </a>
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
            {!isSolutions && (
              <Link className="button secondary sm" to={`/products/${p.slug}`}>
                {learnMoreLabel} <Arrow size={14} aria-hidden="true" />
              </Link>
            )}
          </div>
          {isSolutions && p.demoUrl && !isBpr && (
            <a className="pcard-demo-link" href={withUtm(p.demoUrl, { utm_content: p.slug })}
               target="_blank" rel="noopener noreferrer" onClick={onDemoCb}>
              {ar ? 'شاهد العرض المباشر' : 'View live demo'} <ExternalLink size={13} aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
