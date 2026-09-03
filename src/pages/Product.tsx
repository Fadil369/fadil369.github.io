import { useParams, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { ExternalLink, ShieldCheck, Lock, MessageCircle } from 'lucide-react';
import data from '../data/catalog.json';
import type { Catalog, Product as P } from '../types';
import { useI18n, money } from '../i18n';
import { track, trackViewItem } from '../analytics';
import { useAccountHolder } from '../hooks/useAccountHolder';
import { usePageMeta } from '../hooks/usePageMeta';
import { GHIO_LINKS, withUtm } from '../lib/shopifyRouting';
import { CALENDAR_URL } from '../config/build';

const cat = data as unknown as Catalog;
const ALL: P[] = [...cat.learn, ...cat.solutions, ...cat.build.courses];

function formatFormats(product: P, ar: boolean) {
  if (Array.isArray(product.formats)) {
    return product.formats
      .map(item => {
        const name = ar ? item.nameAr || item.name : item.name;
        const price = item.price ? ` · ${money(item.price, ar)}` : '';
        const billing = item.billing ? ` · ${item.billing}` : '';
        return [name, price + billing, item.desc].filter(Boolean).join(' — ');
      })
      .join('\n');
  }
  return product.formats || 'PDF';
}

function normalizeFaqs(product: P, ar: boolean): Array<[string, string]> {
  const raw = ar && Array.isArray((product as any).faqAr) && (product as any).faqAr.length
    ? (product as any).faqAr
    : product.faqs;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item: unknown) => {
    if (Array.isArray(item)) return [[String(item[0] || ''), String(item[1] || '')] as [string, string]];
    if (item && typeof item === 'object') {
      const entry = item as { q?: unknown; a?: unknown };
      return [[String(entry.q || ''), String(entry.a || '')] as [string, string]];
    }
    return [];
  }).filter(([q, a]) => q && a);
}

export default function Product() {
  const { slug } = useParams();
  const { ar, t } = useI18n();
  const accountHolder = useAccountHolder();
  const p = ALL.find(x => x.slug === slug);

  usePageMeta(p ? {
    title: ar ? p.nameAr || p.name : p.name,
    description: (ar ? p.descriptionAr || p.description : p.description) || p.tagline || p.name,
    image: p.image,
    url: p.slug ? `/products/${p.slug}` : '/',
    type: 'product',
  } : null);

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
  const isMonthly = (p.billingEn || '').toLowerCase() === 'monthly';
  const isLearn = p.stage === 'learn';
  const isBpr = p.slug === 'bpr';
  const periodLabel = isMonthly && !isLearn ? (ar ? ' / شهر' : ' / month') : '';
  const ctaLabel = isMonthly ? (ar ? 'اشترك الآن' : 'Subscribe now') : t('cta.buy');

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

          <p className="product-price">{isBpr
            ? (ar ? 'سنوي 3,960 ر.س · شهري 163 ر.س للمبتدئين' : 'Annual 3,960 SAR · Junior monthly 163 SAR')
            : isLearn
            ? (p.shopifyUrlOneTime
                ? (ar ? `PDF فردي ${money(p.oneTimePrice ?? 99, true)} · أو 182 ريال/شهر لكل الكتب الـ40` : `Individual PDF ${money(p.oneTimePrice ?? 99, false)} · or 182 SAR/month for all 40 books`)
                : (ar ? 'متوفر ضمن اشتراك LEARN — 182 ريال/شهر لكل الكتب الـ40' : 'Available in LEARN — 182 SAR/month for all 40 books'))
            : money(shownPrice, ar) + periodLabel}</p>

          {isBpr ? (
            <>
              <a className="button primary lg" href={withUtm(GHIO_LINKS.bpr, { utm_content: p.slug, plan: 'bpr-annual' })}
                   target="_blank" rel="noopener noreferrer" onClick={onBuy}>
                  {ar ? 'ابدأ بالخطة السنوية — 3,960 ريال' : 'Start annual membership — 3,960 SAR'} <ExternalLink size={16} />
              </a>
              <a className="button secondary lg demo-alt" href={withUtm(GHIO_LINKS.bpr, { utm_content: p.slug, plan: 'bpr-monthly' })}
                 target="_blank" rel="noopener noreferrer" onClick={onBuy}>
                {ar ? 'الخطة الشهرية للمبتدئين — 163 ريال' : 'Junior monthly membership — 163 SAR'} <ExternalLink size={16} />
              </a>
              {p.demoUrl && (
                <a className="button secondary lg demo-alt" href={p.demoUrl}
                   target="_blank" rel="noopener noreferrer" onClick={onDemo}>
                  <MessageCircle size={16} />
                  {ar ? 'افتح السجل الحي' : 'Open live registry'}
                </a>
              )}
              <div className="glass" style={{ padding: '12px 16px', borderRadius: 12, marginTop: 12, fontSize: '0.9rem', lineHeight: 1.6 }}>
                <strong>{ar ? 'ماذا بعد الدفع؟ — BPR' : 'What happens after payment? — BPR'}</strong>
                <ul style={{ margin: '6px 0 0', paddingInlineStart: '1.2rem' }}>
                  <li>{ar ? 'إيميل شكر وترحيب يفتح مسار الهوية المهنية.' : 'Thank-you and welcome emails start the professional identity flow.'}</li>
                  <li>{ar ? 'SPID + OID + QR + صفحة تحقق عامة ثنائية اللغة.' : 'SPID + OID + QR + bilingual public verification profile.'}</li>
                  <li>{ar ? 'الخطة السنوية افتراضية وموصى بها؛ الشهرية متاحة للعامل الصحي المبتدئ.' : 'Annual is the default recommended plan; monthly is available for junior workers.'}</li>
                  <li>{ar ? 'يتصل مع LEARN وBUILD وSOLUTION طالما الحساب نشط.' : 'Connects into LEARN, BUILD and SOLUTION while the account remains active.'}</li>
                </ul>
              </div>
            </>
          ) : p.stage === 'solutions' && (p.shopifyUrlMonthly || p.shopifyUrl) ? (
            <>
              <a className="button primary lg" href={withUtm(p.shopifyUrlMonthly || GHIO_LINKS.solutionMonthly, { utm_content: p.slug, plan: 'solution-monthly' })}
                   target="_blank" rel="noopener noreferrer" onClick={onBuy}>
                  {ar ? '🚀 اشترك في خطة الحلول الشهرية — 1,999 ريال/شهر' : '🚀 Subscribe to Solutions monthly — 1,999 SAR/mo'} <ExternalLink size={16} />
              </a>
              <a className="button secondary lg" href={withUtm(GHIO_LINKS.solutionReadyProduct, { utm_content: p.slug, plan: 'solution-ready' })}
                   target="_blank" rel="noopener noreferrer" onClick={onBuy}>
                  {ar ? '⚡ حل جاهز — دفعة واحدة 24,000 ريال' : '⚡ Pre-built solution — one-time 24,000 SAR'}
                  <ExternalLink size={16} />
              </a>
              {p.demoUrl && (
                <a className="button secondary lg demo-alt" href={p.demoUrl}
                   target="_blank" rel="noopener noreferrer" onClick={onDemo}>
                  <MessageCircle size={16} />
                  {ar ? '▶ عرض مباشر حي' : '▶ Live demo'}
                </a>
              )}
              <p className="fineprint">
                {ar
                  ? 'الخطة الشهرية: استضافة خطوة بخطوة حتى الإطلاق مع فريق BrainSAIT · الحل الجاهز: تسليم فوري مع جلسة إعداد + استبيان بنية تحتية'
                  : 'Monthly plan: incubated step-by-step to launch with the BrainSAIT team · Pre-built: instant delivery with a setup session + infrastructure form'}
              </p>
              <div className="glass" style={{ padding: '12px 16px', borderRadius: 12, marginTop: 12, fontSize: '0.9rem', lineHeight: 1.6 }}>
                <strong>{ar ? 'ماذا بعد الدفع؟ — Solutions' : 'What happens after payment? — Solutions'}</strong>
                <ul style={{ margin: '6px 0 0', paddingInlineStart: '1.2rem' }}>
                  <li>{ar ? 'إيميل شكراً + ترحيبي مخصص بالخطة (شهري أو جاهز) + تتبع عبر Hub' : 'Thank-you + tailored welcome email (monthly or pre-built) + Hub tracking'}</li>
                  <li>{ar ? 'شهري 1,999 ر.س: رابط Learn خاص + كل صفحات Build (Notion + العقل الثاني) + بوت تليجرام + وصول Super-Partner إلى Lark — حضانة شركة خطوة بخطوة حتى التسويق والتخرج والشهادة' : 'Monthly 1,999 SAR: private Learn link + all Build pages (Notion + 2nd Brain) + Telegram bot + Super-Partner Lark — incubated step-by-step to launch, marketing & badge'}</li>
                  <li>{ar ? 'جاهز 24,000 ر.س لمرة واحدة: رابط Google Calendar فوري لحجز جلسة + استبيان متطلبات آمن للبنية والمجال والاستضافة وتسليم الكود المصدري كحزمة' : 'Pre-built 24k one-time: instant Google Calendar link to book a session + secure requirements intake for infra/domain/hosting & source code as packaged solution'}</li>
                  <li>
                    {ar ? 'وصول منصة الكود مضمون في الخطتين: ' : 'Code platform access is included in both plans: '}
                    <a href="https://code.brainsait.org" target="_blank" rel="noopener noreferrer">code.brainsait.org</a>
                    {ar ? ' — مساحة عمل محجوزة باسمك لتجهيز ومراجعة وتسليم حلك.' : ' — a workspace reserved for packaging, reviewing and handing over your solution.'}
                  </li>
                  <li>{ar ? 'تكامل عالٍ: GitHub · Notion · Airtable · Canvas · Hermes · Lark — توفر وأتمتة عاليان' : 'High integration via: GitHub · Notion · Airtable · Canvas · Hermes · Lark — high availability & automation'}</li>
                </ul>
              </div>
            </>
          ) : isLearn ? (
            <>
              {p.shopifyUrlOneTime && (
                <a className="button primary lg" href={withUtm(p.shopifyUrlOneTime, { utm_content: p.slug, plan: 'learn-one-time' })}
                   target="_blank" rel="noopener noreferrer" onClick={onBuy}>
                  {ar ? `اشترِ PDF الآن · ${money(p.oneTimePrice ?? 99, true)}` : `Buy PDF now · ${money(p.oneTimePrice ?? 99, false)}`} <ExternalLink size={16} />
                </a>
              )}
              <a className="button secondary lg demo-alt" href={withUtm(GHIO_LINKS.learnMonthly, { utm_content: p.slug, plan: 'learn-monthly' })}
                 target="_blank" rel="noopener noreferrer" onClick={onBuy}>
                {ar ? 'افتح كل الكتب · 182 ريال/شهر' : 'Unlock all books · 182 SAR/month'} <ExternalLink size={16} />
              </a>
              <p className="fineprint"><ShieldCheck size={14} /> {ar ? 'تحميل PDF فوري للشراء الفردي، أو رابط واحد للوصول إلى المكتبة كاملة.' : 'Instant PDF delivery for one-time purchases, or one link for the complete library.'}</p>
              <div className="glass" style={{ padding: '12px 16px', borderRadius: 12, marginTop: 12, fontSize: '0.9rem', lineHeight: 1.6 }}>
                <strong>{ar ? 'ماذا بعد الدفع؟ — Learn' : 'What happens after payment? — Learn'}</strong>
                <ul style={{ margin: '6px 0 0', paddingInlineStart: '1.2rem' }}>
                  <li>{ar ? 'إيميل شكراً على الشراء فوراً + إيميل ترحيبي حسب الخطة' : 'Instant thank-you email + welcome email tailored to your plan'}</li>
                  <li>{ar ? 'الاشتراك الشهري: رابط مكتبة خاص يُرسل بعد الدفع لكل الـ 40 كتاباً (يبقى فعالاً حتى دورة الفوترة التالية، مع تذكيرات دفع)' : 'Monthly: a private library access link is sent after payment for all 40 books (active until the next billing cycle, with payment reminders)'}</li>
                  <li>{ar ? 'الشراء الفردي: رابط تحميل R2 فوري لهذا الكتاب فقط — تسليم رقمي آمن' : 'One-time: instant R2 download link for this book only — secure digital delivery'}</li>
                  <li>{ar ? 'دعم عالي التوفر عبر: GitHub · Notion · Airtable · Canvas · Hermes · Lark — أتمتة كاملة وعالية التكامل' : 'High-availability support via: GitHub · Notion · Airtable · Canvas · Hermes · Lark — fully automated, highly integrated'}</li>
                </ul>
              </div>
            </>
          ) : p.shopifyUrl ? (
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
                  {ctaLabel} <ExternalLink size={16} />
                </a>
                {p.demoUrl && (
                  <a className="button secondary lg demo-alt" href={p.demoUrl}
                     target="_blank" rel="noopener noreferrer" onClick={onDemo}>
                    <MessageCircle size={16} />
                    {ar ? 'اطلب عرضاً تجريبياً / احجز جلسة' : 'Request a demo / Book a session'}
                  </a>
                )}
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

      {p.stage === 'solutions' && (
        <>
          <section className="book-section reveal">
            <div className="section-head">
              <h2>{ar ? 'احجز جلسة تعريفية' : 'Book a session'}</h2>
              <span className="book-note">{ar ? 'اختر موعداً يناسبك — سنتحدث عن النطاق والتسعير والتنفيذ.' : 'Pick a time that suits you — we will cover scope, pricing and rollout.'}</span>
            </div>
            <div className="book-frame">
              <iframe
                src="https://calendar.google.com/calendar/appointments/schedules/AcZssZ0edxToXuq6bDCBKRZ8_EOcx-Qp6M_bgUVjGQKEeNE2sxMLRxCNlsjk2flHMwMU2hvJyhFy_8Og?gv=true"
                style={{ border: 0 }} width="100%" height="600" frameBorder={0} loading="lazy" title="Book a session" />
            </div>
          </section>
          <section className="book-section reveal" style={{ marginTop: 18 }}>
            <div className="section-head">
              <h2>{ar ? 'استبيان الحل الجاهز — سلم متطلباتك' : 'Pre-built Solution Form — Submit your requirements'}</h2>
              <span className="book-note">{ar ? 'بعد دفع 24,000 ر.س، يصلك رابط الاستبيان الآمن مع حجز الجلسة لتسليم تفاصيل البنية، المجال، الاستضافة والحزمة المطلوبة.' : 'After 24k payment, you receive the secure intake form with the booking flow for infra, domain, hosting, and package details.'}</span>
            </div>
            <div className="glass" style={{ padding: 18, borderRadius: 14 }}>
              <p style={{ margin: '0 0 12px', color: 'var(--ink-soft)' }}>
                {ar ? 'الاستبيان الآمن يغطي: اسم الحل، مجال العمل، البنية الحالية، الاستضافة المفضلة (Hetzner/Cloudflare)، المجال، متطلبات الدفع، اللغة، والوقت المطلوب للتسليم. لا نعرض رابط الاستبيان العام قبل الدفع.' : 'The secure intake covers: solution name, domain, current infra, preferred hosting (Hetzner/Cloudflare), domain, payment needs, language, and desired delivery timeline. The intake link is not exposed publicly before payment.'}
              </p>
              <a className="button primary" href={CALENDAR_URL} target="_blank" rel="noopener noreferrer">
                {ar ? 'احجز جلسة الاستلام' : 'Book the handoff session'} <ExternalLink size={14} />
              </a>
              <p className="fineprint" style={{ marginTop: 10 }}>{ar ? 'الرابط يُرسل تلقائياً بإيميل الترحيب بعد الدفع الجاهز، مع رابط Calendar الفوري.' : 'Link is also sent automatically in the welcome email after pre-built payment, with the instant Calendar link.'}</p>
            </div>
          </section>
        </>
      )}
      {(isLearn || isBpr) && (
        <section className="book-section reveal" style={{ marginTop: 18 }}>
          <div className="section-head">
            <h2>{isBpr ? (ar ? 'تفاصيل العضوية' : 'Membership details') : (ar ? 'المزيد عن هذا الكتاب' : 'More about this book')}</h2>
            <span className="book-note">{ar ? 'تفاصيل شاملة، أسئلة شائعة، وصيغ متاحة — كل شيء في نافذة واحدة.' : 'Full details, FAQs, and available formats — everything in one place.'}</span>
          </div>
          <div className="glass" style={{ padding: 18, borderRadius: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div>
                <strong>{ar ? 'الصيغ' : 'Formats'}</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--ink-soft)', whiteSpace: 'pre-line' }}>{formatFormats(p, ar)}</p>
              </div>
              <div>
                <strong>{ar ? 'ما يتضمنه' : "What's included"}</strong>
                <ul style={{ margin: '6px 0 0', paddingInlineStart: '1.2rem', color: 'var(--ink-soft)' }}>{(p.whatsIncluded || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
              <div>
                <strong>{ar ? 'تقييم' : 'Rating'}</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--ink-soft)' }}>{p.rating ? `${p.rating}/5` : ar ? '—' : '—'} · {p.users || ''}</p>
              </div>
            </div>
            {!!normalizeFaqs(p, ar).length && (
              <div style={{ marginTop: 16 }}>
                <strong>{ar ? 'أسئلة شائعة' : 'FAQs'}</strong>
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  {normalizeFaqs(p, ar).slice(0, 6).map(([q, a], i) => (
                    <details key={i} style={{ background: 'var(--surface)', padding: '10px 14px', borderRadius: 10 }}>
                      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{q}</summary>
                      <p style={{ margin: '8px 0 0', color: 'var(--ink-soft)' }}>{a}</p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
