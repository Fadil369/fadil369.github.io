import { useMemo, useState } from 'react';
import { BadgeCheck, CreditCard, MonitorPlay } from 'lucide-react';
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
  const bpr = cat.solutions.find(item => item.slug === 'bpr');
  const items: Product[] = stage === 'learn' && bpr ? [bpr, ...cat.learn] : stage === 'templates' ? cat.templates : stage === 'oid-registry' ? (cat.oid ?? []) : cat.solutions;

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
            <h2>{ar ? 'كل كتب LEARN الأربعين + BPR — دفع آمن عبر Shopify' : 'All 40 LEARN books + BPR — Shopify-powered access'}</h2>
            <p>{ar ? 'بطاقات الكتب تتيح شراء PDF فردي بعد الدفع أو الاشتراك الشهري 182 ر.س لكل المكتبة. بطاقة BPR مضافة هنا أيضاً بخطة سنوية افتراضية وشهرية للمبتدئين.' : 'Book cards support individual PDF purchase after payment or the 182 SAR monthly library subscription. BPR is also surfaced here with annual default membership and junior monthly access.'}</p>
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
            <p>{ar ? 'أكثر من 37 بطاقة حل حية، مع روابط ديمو مباشرة، ومساران للدفع على Shopify: 1,999 ر.س شهرياً أو 24,000 ر.س للحل الجاهز لكل بطاقة.' : 'More than 37 live solution cards, with direct demo links, and two Shopify payment paths: 1,999 SAR/month or 24,000 SAR for each ready-built solution.'}</p>
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

      {stage === 'templates' && (
        <section className="shelf-plan-banner reveal" aria-label={ar ? 'دليل القوالب' : 'Templates guide'}>
          <div>
            <span className="hero-eyebrow"><span className="dot" /> {ar ? 'كيف يعمل' : 'How it works'}</span>
            <h2>{ar ? 'قالب الوكيل: تشترى مرة، يعمل دائمًا' : 'Agent template: buy once, runs forever'}</h2>
            <p>{ar ? 'وكيل ذكاء اصطناعي جاهز (التقاط ← بحث ← توليد ← توجيه ← تقارير) يعمل في حساباتك أنت. نركّبه خلال 5 أيام ونسلّمه مع الوثائق عبر Lark/Telegram، بضمان إصلاح 30 يومًا ومعاملة بيانات وفق PDPL.' : 'A pre-built AI agent (capture → research → generate → route → report) that runs in your own accounts. We configure it within 5 days and hand it over with docs via Lark/Telegram — 30-day fix-it guarantee, PDPL-aware.'}</p>
          </div>
          <a className="button primary lg" href="https://store.brainsait.de/pages/agent-templates-guide" target="_blank" rel="noopener noreferrer">
            {ar ? 'اقرأ الدليل الكامل' : 'Read the full guide'}
           </a>
         </section>
       )}

      {stage === 'oid-registry' && (
        <section className="shelf-plan-banner reveal" aria-label={ar ? 'الهوية والسجل' : 'OID & Registry'}>
          <div>
            <span className="hero-eyebrow"><span className="dot" /> {ar ? 'نظام الهوية والسجل' : 'Identity & Registry'}</span>
            <h2>{ar ? 'OID: هويتك الرقمية على IASPA' : 'OID: Your Digital Identity on IASPA'}</h2>
            <p>{ar ? 'نظام الهوية عبر الإنترنت (OID) وسجل مزودي الخدمات — شارات التحقق، تراخيص المؤسسات، تكامل FHIR، وحلول NPHIES.' : 'Online Identity (OID) system and provider registry — verification badges, enterprise licenses, FHIR integration, and NPHIES solutions.'}</p>
          </div>
          <a className="button primary lg" href="https://register.brainsait.org" target="_blank" rel="noopener noreferrer">
            {ar ? 'سجّل هويتك الآن' : 'Register Your OID'}
          </a>
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
          {([
            ['all', ar ? 'الكل' : 'All', null],
            ['product', ar ? 'منتجات' : 'Products', CreditCard],
            ['demo', ar ? 'عروض' : 'Demos', MonitorPlay],
            ['service', ar ? 'خدمات' : 'Services', CreditCard],
            ['saas', ar ? 'عضويات' : 'Memberships', BadgeCheck],
          ] as const)
            .map(([v, label, Icon]) => (
              <button role="tab" key={v} aria-selected={comm === v}
                      className={'chip' + (comm === v ? ' active' : '')}
                      onClick={() => setComm(v)}>
                {Icon ? <Icon size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} /> : null}{label}
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
