import { Link } from 'react-router-dom';
import { BadgeCheck, CreditCard, ExternalLink, Info, MonitorPlay, Star } from 'lucide-react';
import type { Product } from '../types';
import { useI18n, money } from '../i18n';
import { track } from '../analytics';
import { useAccountHolder } from '../hooks/useAccountHolder';
import { GHIO_LINKS, withUtm } from '../lib/shopifyRouting';

/** Derive a small format/type chip from the product name (bilingual). */
function formatLabel(name: string, ar: boolean): string | null {
  const n = name.toLowerCase();
  if (n.includes('mini-book')) return ar ? 'كتاب مصغر' : 'Mini-Book';
  if (n.includes('notebook')) return ar ? 'دفتر' : 'Notebook';
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

/** Small icon for commercial badge */
function CommIcon({ commercial, size }: { commercial: string; size: number }) {
  switch (commercial) {
    case 'demo': return <MonitorPlay size={size} />;
    case 'saas': return <BadgeCheck size={size} />;
    default: return <CreditCard size={size} />;
  }
}

export default function ProductCard({ p }: { p: Product }) {
  const { ar, t } = useI18n();
  const accountHolder = useAccountHolder();
  const name = ar ? p.nameAr || p.name : p.name;
  const tagline = ar ? p.taglineAr || p.tagline : p.tagline;
  const freeForYou = accountHolder === true;
  const commercial = p.commercial || (p.demoUrl ? 'demo' : 'product');
  const commLabel = commercial === 'product' ? (ar ? 'منتج' : 'Product')
    : commercial === 'service' ? (ar ? 'خدمة' : 'Service')
      : commercial === 'saas' ? (ar ? 'عضوية' : 'Membership') : (ar ? 'عرض' : 'Demo');
  const fmt = formatLabel(p.name, ar);
  const benefit = p.benefits?.[0];
  const isMonthly = (p.billingEn || '').toLowerCase() === 'monthly';
  const isLearn = p.stage === 'learn';
  const isSolutions = p.stage === 'solutions';
  const isBuild = p.stage === 'build';
  const isBpr = p.slug === 'bpr';
  const ctaLabel = isMonthly || isBpr ? (ar ? 'اشترك' : 'Subscribe') : (freeForYou ? t('cta.getFree') : t('cta.buy'));
  const learnMoreLabel = (isLearn || isSolutions || isBuild) ? (ar ? 'اعرف المزيد' : 'Learn more') : t('cta.details');

  const onBuy = () =>
    track('add_to_cart', {
      currency: 'SAR',
      value: p.price,
      items: [{ item_id: p.slug, item_name: p.name, price: p.price }],
    });
  const onDemoCb = () => track('view_demo', { item_id: p.slug, item_name: p.name });
  const onFree = () => track('add_to_cart', { currency: 'SAR', value: 0, items: [{ item_id: p.slug, item_name: p.name, price: 0 }] });

  // Determine payment URL based on product tier
  const isPayable = Boolean(p.shopifyUrl || isLearn || isBuild || isSolutions || isBpr);
  
  const paymentUrl = isBpr
    ? (ar ? GHIO_LINKS.bprAnnual : GHIO_LINKS.bprMonthly)
    : isLearn
      ? (p.shopifyUrlOneTime || GHIO_LINKS.learnMonthly)
      : isBuild
        ? (p.shopifyUrl || GHIO_LINKS.buildMonthly)
        : isSolutions
          ? (p.shopifyUrlMonthly || GHIO_LINKS.solutionMonthly)
          : (p.shopifyUrl || '');

  // Solutions ready (24k one-time) payment URL
  const readyPaymentUrl = p.shopifyUrlOneTime || GHIO_LINKS.solutionReadyProduct;

  // Learn more / detail page URL
  const detailUrl = `/products/${p.slug}`;

  // Format price display
  const priceDisplay = isBpr
    ? (ar ? 'سنوي 3,960 · شهري 163' : 'Annual 3,960 · Monthly 163')
    : isLearn
      ? (p.shopifyUrlOneTime
          ? (ar ? `${money(p.oneTimePrice ?? 99, true)} فردي · أو 182 ريال/شهر` : `${money(p.oneTimePrice ?? 99, false)} one-time · or 182 SAR/mo`)
          : (ar ? '182 ريال/شهر لكل المكتبة' : '182 SAR/mo for library'))
      : isBuild
        ? (ar ? '499 ريال/شهر · أو 9,630 كامل' : '499 SAR/mo · or 9,630 full')
        : isSolutions
          ? (ar ? '1,999 شهرياُ · 24,000 جاهز' : '1,999/mo · 24,000 ready')
          : money(freeForYou ? 0 : (p.price ?? 0), ar) + (isMonthly && !isLearn ? (ar ? '/شهر' : '/mo') : '');

  return (
    <article className="pcard">
      <div className="pcard-cover">
        <Link to={`/products/${p.slug}`} className="pcard-cover-link" aria-label={name}>
          {p.image
            ? <img src={p.image} alt={name} loading="lazy" decoding="async" width={320} height={200} style={{ aspectRatio: '16/10' }} />
            : <div className="pcard-cover-fallback" aria-hidden="true">{name.slice(0, 1)}</div>}
        </Link>
        <div className="pcard-badges" aria-hidden="true">
          <div className="pcard-badge-row">
            <span className="pcard-badge-set">
              <span className={`pcard-badge comm comm-${commercial}`}><CommIcon commercial={commercial} size={11} /> {commLabel}</span>
              {freeForYou && <span className="pcard-badge pcard-badge-free">{t('free')}</span>}
            </span>
            {p.flag === 'demo' && <span className="pcard-badge">{t('demo')}</span>}
          </div>
          {fmt && <div className="pcard-format-row"><span className="pcard-badge pcard-format">{fmt}</span></div>}
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
          {/* Price */}
          <span className="pcard-price">{priceDisplay}</span>

          {/* Two-button CTA */}
          <div className="pcard-cta">
            {/* Primary: Payment */}
            {isBpr ? (
              <a className="button primary sm" href={withUtm(ar ? GHIO_LINKS.bprAnnual : GHIO_LINKS.bprMonthly, { utm_content: p.slug, plan: 'bpr' })}
                 target="_blank" rel="noopener noreferrer" onClick={onBuy}>
                {ar ? 'اشترك' : 'Pay'} <ExternalLink size={14} aria-hidden="true" />
              </a>
            ) : isPayable ? (
              <a className="button primary sm" href={withUtm(paymentUrl, { utm_content: p.slug, plan: isLearn ? (p.shopifyUrlOneTime ? 'learn-one-time' : 'learn-monthly') : isBuild ? (p.shopifyUrl ? 'build-ticket' : 'build-monthly') : isSolutions ? 'solution-monthly' : '' })}
                 target="_blank" rel="noopener noreferrer" onClick={onBuy}>
                {ar ? (isLearn && !p.shopifyUrlOneTime ? 'ادفع · 182' : isBuild ? 'ادفع · 499' : isSolutions ? 'ادفع · 1,999' : isLearn ? 'ادفع · 99' : 'ادفع') : (isLearn && !p.shopifyUrlOneTime ? 'Pay · 182' : isBuild ? 'Pay · 499' : isSolutions ? 'Pay · 1,999' : isLearn ? 'Pay · 99' : 'Pay')} <ExternalLink size={14} aria-hidden="true" />
              </a>
            ) : p.demoUrl ? (
              <a className="button primary sm" href={withUtm(p.demoUrl)}
                 target="_blank" rel="noopener noreferrer" onClick={onDemoCb}>
                {commercial === 'service' ? (ar ? 'احجز الجلسة' : 'Book session') : t('cta.demo')}
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            ) : (
              <Link className="button primary sm" to={`/products/${p.slug}`} onClick={onBuy}>
                {ar ? 'اطلب' : 'Request'} <Info size={14} aria-hidden="true" />
              </Link>
            )}

            {/* Secondary: Learn More */}
            <Link className="button secondary sm" to={detailUrl}>
              {learnMoreLabel} <Info size={14} aria-hidden="true" />
            </Link>
          </div>

          {/* Solutions: 24k Ready button */}
          {isSolutions && (
            <a className="button tertiary sm" href={withUtm(readyPaymentUrl, { utm_content: p.slug, plan: 'solution-ready' })}
               target="_blank" rel="noopener noreferrer" onClick={onBuy}
               style={{ marginTop: 4, fontSize: 12, padding: '6px 10px' }}>
              {ar ? 'جاهز · 24,000' : 'Ready · 24k'} <ExternalLink size={12} aria-hidden="true" />
            </a>
          )}

          {/* Solutions demo link */}
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