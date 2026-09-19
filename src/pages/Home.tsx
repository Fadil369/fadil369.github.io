import { Link } from 'react-router-dom';
import { BookOpen, Hammer, Boxes, ArrowLeft, Sparkles, Fingerprint, LayoutTemplate, Clock } from 'lucide-react';
import data from '../data/catalog.json';
import type { Catalog } from '../types';
import { useI18n, money } from '../i18n';
import ProductCard from '../components/ProductCard';
import BenefitsMatrix from '../components/BenefitsMatrix';
import JourneyFlow from '../components/JourneyFlow';
import { usePageMeta } from '../hooks/usePageMeta';
import { catalogSummary, getCatalogStats } from '../lib/catalogStats';
import { GHIO_LINKS, withUtm } from '../lib/shopifyRouting';

const cat = data as unknown as Catalog;
const ICONS = [BookOpen, Hammer, Boxes, LayoutTemplate, Fingerprint];
const ACCENTS = ['learn', 'build', 'solutions', 'templates', 'oid'];

export default function Home() {
  const { ar, t } = useI18n();
  const bpr = cat.solutions.find(p => p.slug === 'bpr');
  const featured = bpr ? [bpr, ...cat.learn.slice(0, 7)] : cat.learn.slice(0, 8);
  const stats = getCatalogStats(cat);
  const counts: Record<string, number> = {
    learn: cat.learn.length,
    build: stats.build,
    solutions: cat.solutions.length,
    templates: cat.templates.length,
    'oid-registry': (cat.oid ?? []).length,
  };

  usePageMeta({
    title: ar ? 'متجر BrainSAIT — تعلّم · ابنِ · حلول' : 'BrainSAIT Store — Learn · Build · Solutions',
    description: 'BrainSAIT Store — Learn, Build, Solutions. Books, courses, incubation program and live software for healthcare, business and development.',
    url: '/',
    type: 'website',
  });

  return (
    <main className="page">
      <section className="hero reveal">
        <span className="hero-eyebrow"><span className="dot" /> {ar ? 'متجر برينسايت الفاخر' : 'The BrainSAIT Luxury Store'}</span>
        <h1>{ar ? 'تعلّم · ابنِ · حلول' : 'Learn · Build · Solutions'}</h1>
        <p className="lede">
          {ar
            ? `كتالوج BrainSAIT الحالي يضم ${stats.total} عرضاً قابلاً للتسويق: تعلّم، بناء، حلول جاهزة، قوالب وكلاء، وهوية OID/BPR — متصلة بمدفوعات Shopify ومسارات متابعة بعد الشراء.`
            : `The current BrainSAIT catalog has ${stats.total} market-ready offers across Learn, Build, Solutions Ready, agent templates, and OID/BPR identity — connected to Shopify checkout and post-purchase follow-up.`}
        </p>
        <div className="build-launch-strip home-pricing-strip">
          <span className="launch-tag">{ar ? 'مسارات المتجر الحية' : 'Live store paths'}</span>
          <span className="launch-now">{ar ? `${stats.learn} تعلّم · 182 ر.س/شهر` : `${stats.learn} Learn · 182 SAR/mo`}</span>
          <span className="launch-now">{ar ? `${stats.build} بناء · حتى 9,630 ر.س` : `${stats.build} Build · up to 9,630 SAR`}</span>
          <span className="launch-now">{ar ? `${stats.solutions} حلول جاهزة · 24,000 ر.س` : `${stats.solutions} Ready solutions · 24,000 SAR`}</span>
          <span className="launch-now">{ar ? `${stats.oid} هوية وسجل` : `${stats.oid} OID & Registry`}</span>
        </div>
      </section>

      <section className="ecosystem-command reveal" aria-label={ar ? 'غرفة تشغيل BrainSAIT' : 'BrainSAIT operating room'}>
        <div className="ecosystem-command__copy">
          <span className="hero-eyebrow"><span className="dot" /> {ar ? 'تشغيل موحّد' : 'Unified operating layer'}</span>
          <h2>{ar ? 'متجر واحد في الواجهة، منظومة كاملة خلفه' : 'One storefront on the surface, a complete ecosystem behind it'}</h2>
          <p>{catalogSummary(cat, ar)}</p>
          <p>
            {ar
              ? 'كل بطاقة يجب أن تقود إلى قرار واضح: ادفع، شاهد ديمو، أو اترك طلباً. لذلك رتبنا المسارات حول الثقة، الدفع، والتسليم بدل كثرة الروابط.'
              : 'Every card should lead to one clear decision: pay, view a demo, or submit a request. The experience is now framed around trust, checkout, and delivery instead of link sprawl.'}
          </p>
        </div>
        <div className="ecosystem-command__grid">
          <a href={withUtm(GHIO_LINKS.learnMonthly, { utm_content: 'home-operating-room', plan: 'learn-monthly' })} target="_blank" rel="noopener noreferrer">
            <strong>{ar ? 'LEARN' : 'LEARN'}</strong>
            <span>{ar ? 'دفع شهري واضح للمكتبة' : 'Clear monthly library checkout'}</span>
          </a>
          <Link to="/build">
            <strong>{ar ? 'BUILD' : 'BUILD'}</strong>
            <span>{ar ? 'مسار بناء مؤسس إلى إطلاق' : 'Founder build path to launch'}</span>
          </Link>
          <Link to="/solutions">
            <strong>{ar ? 'SOLUTIONS' : 'SOLUTIONS'}</strong>
            <span>{ar ? 'حلول جاهزة مع ديمو ودفع' : 'Ready solutions with demos and payment'}</span>
          </Link>
          <Link to="/oid">
            <strong>{ar ? 'OID / BPR' : 'OID / BPR'}</strong>
            <span>{ar ? 'هوية، تحقق، وسجل مزودين' : 'Identity, verification, provider registry'}</span>
          </Link>
        </div>
      </section>

      <section className="stages">
        {cat.stages.map((s, i) => {
          const Icon = ICONS[i] || BookOpen;
          return (
            <Link key={s.id} to={s.route} className={`stage-card ${ACCENTS[i] || ''}`}>
              <span className="stage-icon"><Icon size={24} strokeWidth={2.2} /></span>
              <h2>
                {ar ? s.ar : s.en}
                {s.id === 'build' && <span> <Sparkles size={20} style={{ verticalAlign: 'text-bottom' }} /></span>}
              </h2>
              <p>{ar ? s.blurbAr : s.blurbEn}</p>
              <span className="stage-count" data-suffix={ar ? 'عنواناً' : 'titles'}>{counts[s.id]}</span>
              <ArrowLeft size={18} className="stage-arrow" />
            </Link>
          );
        })}
      </section>

      <BenefitsMatrix />

      <JourneyFlow />

      <section>
        <div className="section-head reveal">
          <h2>{ar ? 'مميز' : 'Featured'}</h2>
          <Link className="button secondary sm" to="/learn">{t('nav.all')}</Link>
        </div>
        <div className="grid reveal">
          {featured.map(p => <ProductCard key={p.slug} p={p} />)}
        </div>
      </section>

      {cat.build.program ? (
        <section className="program-teaser reveal">
          <h2>{ar ? cat.build.program.nameAr : cat.build.program.name}</h2>
          <p>{ar ? cat.build.program.taglineAr : cat.build.program.tagline}</p>
          <strong>{money(cat.build.program.price, ar)}</strong>
          <Link className="button primary" to="/build">{t('cta.apply')}</Link>
        </section>
      ) : (
        <section className="program-teaser reveal">
          <h2>{ar ? 'مسار BUILD مفتوح عبر المختبرات التطبيقية' : 'BUILD is open through hands-on labs'}</h2>
          <p>{ar ? `ابدأ من أحد مسارات البناء المنشورة حالياً (${stats.build})، ثم انتقل إلى جلسة استراتيجية أو حل جاهز حسب جاهزية مشروعك.` : `Start from one of the currently published build paths (${stats.build}), then move into a strategy session or ready solution based on your project maturity.`}</p>
          <strong>{ar ? 'حتى 9,630 ر.س' : 'Up to 9,630 SAR'}</strong>
          <Link className="button primary" to="/build">{t('cta.apply')}</Link>
        </section>
      )}

      {/* Intake CTA */}
      <section className="program-teaser reveal" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', borderRadius: 'var(--radius)', padding: '3rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Clock size={28} style={{ color: '#f59e0b' }} />
          <h2 style={{ marginBottom: 0 }}>{ar ? 'سباق 48 ساعة — هوية صحية جاهزة' : '48-Hour Sprint — AI-Native Healthcare Identity'}</h2>
        </div>
        <p style={{ color: '#94a3b8', maxWidth: 600, lineHeight: 1.6, marginBottom: 24 }}>
          {ar
            ? 'أطباء، عيادات، مؤسسين، ومؤسسات صحية — قدّم الآن وسنرشدك إلى أسرع مسار: جلسة استراتيجية، BUILD، BPR، أو حلول جاهزة.'
            : 'For doctors, clinics, founders, and healthcare organizations — apply now and we will guide you to the fastest path: strategy session, BUILD, BPR, or Solutions Ready.'}
        </p>
        <Link to="/intake" className="button primary">
          {ar ? 'قدّم الآن — ابدأ' : 'Apply Now — Get Started'}
          {' '}→
        </Link>
        <Link to="/sprint" className="button secondary" style={{ marginLeft: 12 }}>
          {ar ? 'مزيد من المعلومات' : 'Learn More'}
        </Link>
      </section>
    </main>
  );
}
