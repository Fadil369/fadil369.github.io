import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Shield, Zap, ArrowRight, CheckCircle2, Building2, Stethoscope, Award, Rocket } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { useI18n } from '../i18n';

const STORE = 'https://store.brainsait.de';
const CALENDAR_BOOK = 'https://calendar.app.google/BrainSAIT48hSprint';
// The 2,390 SAR strategy session is booked via calendar and invoiced through
// Daftra (POST daftra.brainsait.org/api/sprint/invoice) — no Shopify product.
const STRATEGY_SESSION = CALENDAR_BOOK;
const BUILD_TICKET = `${STORE}/products/build-full-program-ticket`;
const BPR_PRO = `${STORE}/products/provider-registry`;
const BPR_ELITE = `${STORE}/products/provider-registry`;
const SOLUTIONS_READY = `${STORE}/products/solutions-ready-enterprise-deployment-1`;

const UPGRADES = [
  { name: 'BUILD Ticket — Incubation Pass', nameAr: 'تذكرة BUILD — برنامج الاحتضان', price: '9,630 SAR', buyer: 'Founder, doctor, clinic operator', buyerAr: 'مؤسس، طبيب، مدير عيادة', url: BUILD_TICKET, icon: Building2 },
  { name: 'BPR AI Professional', nameAr: 'BPR AI مهني', price: '4,900–9,900 SAR/yr', buyer: 'Doctor, nurse, healthcare worker', buyerAr: 'طبيب، ممرض، عامل صحي', url: BPR_PRO, icon: Stethoscope },
  { name: 'BPR AI Elite', nameAr: 'BPR AI نخبة', price: '19,900 SAR/yr', buyer: 'Senior consultant, educator', buyerAr: 'مستشار أول، معلم', url: BPR_ELITE, icon: Award },
  { name: 'Solutions Ready', nameAr: 'حلول جاهزة', price: '24,000 SAR', buyer: 'Clinic, hospital, organization', buyerAr: 'عيادة، مستشفى، مؤسسة', url: SOLUTIONS_READY, icon: Rocket },
];

const TRUST_ITEMS = [
  { en: 'BrainSAIT OID root: 1.3.6.1.4.1.61026', ar: 'جذر OID: 1.3.6.1.4.1.61026' },
  { en: 'BPR identity layer: SPID, OID, FHIR, DID, QR', ar: 'طبقة الهوية: SPID, OID, FHIR, DID, QR' },
  { en: 'Saudi Clinical Copilot included', ar: 'مساعد السريري السعودي مضمن' },
  { en: 'Evidence-based bilingual KB support', ar: 'دعم المعرفة ثنائي اللغة القائم على الأدلة' },
  { en: 'SCFHS remains the official licensing authority', ar: 'المجلس السعودي يبقى الجهة الرسمية للترخيص' },
];

export default function Sprint() {
  const { ar } = useI18n();
  const [countdown, setCountdown] = useState({ hours: 48, minutes: 0, seconds: 0 });

  usePageMeta({
    title: ar ? 'BrainSAIT 48-Hour Sprint — بنية تحتية صحية بالذكاء الاصطناعي' : 'BrainSAIT 48-Hour Sprint — AI Healthcare Infrastructure',
    description: ar
      ? 'احجز جلسة استراتيجية خاصة بـ 2,390 ريال. إذا تم الترقية خلال 7 أيام، يتم احتساب كامل المبلغ. بنية تحتية صحية قابلة للتشغيل.'
      : 'Book a private strategy session for 2,390 SAR. If you upgrade within 7 days, the full fee is credited. Deployable healthcare infrastructure.',
    url: '/sprint',
    type: 'website',
  });

  useEffect(() => {
    const end = Date.now() + 48 * 60 * 60 * 1000;
    const tick = () => {
      const diff = Math.max(0, end - Date.now());
      setCountdown({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="page sprint-page">
      {/* Hero */}
      <section className="sprint-hero">
        <div className="sprint-badge">
          <Clock size={14} /> 48-HOUR SPRINT
        </div>
        <h1>
          {ar
            ? 'ابنِ بنية تحتية صحية بالذكاء الاصطناعي خلال 48 ساعة'
            : 'Build Your AI-Native Healthcare Infrastructure in 48 Hours'}
        </h1>
        <p className="lede">
          {ar
            ? 'للأطباء والعيادات والمؤسسين والمؤسسات الصحية الجاهزة للانتقال من الفكرة إلى الهوية الموثقة وأنظمة الذكاء السريري والبنية القابلة للنشر.'
            : 'For doctors, clinics, founders, and healthcare organizations ready to move from idea to verified identity, clinical AI workflows, and deployable systems.'}
        </p>

        {/* Countdown */}
        <div className="sprint-countdown">
          <div className="countdown-unit">
            <span className="countdown-num">{String(countdown.hours).padStart(2, '0')}</span>
            <span className="countdown-label">{ar ? 'ساعة' : 'Hours'}</span>
          </div>
          <span className="countdown-sep">:</span>
          <div className="countdown-unit">
            <span className="countdown-num">{String(countdown.minutes).padStart(2, '0')}</span>
            <span className="countdown-label">{ar ? 'دقيقة' : 'Min'}</span>
          </div>
          <span className="countdown-sep">:</span>
          <div className="countdown-unit">
            <span className="countdown-num">{String(countdown.seconds).padStart(2, '0')}</span>
            <span className="countdown-label">{ar ? 'ثانية' : 'Sec'}</span>
          </div>
        </div>

        {/* Primary CTA */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/intake" className="button primary sprint-cta">
            <Zap size={18} />
            {ar ? 'قدّم الآن — ابدأ سباق 48 ساعة' : 'Apply Now — Start 48h Sprint'}
          </a>
          <a href={STRATEGY_SESSION} className="button secondary sprint-cta" target="_blank" rel="noopener noreferrer">
            {ar ? '📅 احجز الجلسة مباشرة' : '📅 Book Session Directly'}
          </a>
        </div>
        <p className="sprint-credit-note">
          {ar
            ? 'أكمل نموذج التقديم وسنرشدك للباقة المناسبة. الجلسة الاستراتيجية 2,390 ريال — تُحتسب إذا قمت بالترقية خلال 7 أيام.'
            : 'Complete the intake form and we will guide you to the right package. The 2,390 SAR session fee is credited if you upgrade within 7 days.'}
        </p>
      </section>

      {/* Positioning */}
      <section className="sprint-positioning">
        <blockquote>
          {ar
            ? 'لا نبيع أدوات ذكاء اصطناعي فقط. نبني هوية صحية موثقة، جاهزية للذكاء السريري، وبنية رقمية قابلة للتشغيل في القطاع الصحي السعودي.'
            : 'Stop selling "AI tools." Sell verified healthcare identity, clinical AI readiness, and deployable Saudi health infrastructure.'}
        </blockquote>
      </section>

      {/* What You Get */}
      <section className="sprint-features">
        <h2>{ar ? 'ما تحصل عليه في الجلسة' : 'What You Get in the Session'}</h2>
        <div className="sprint-features-grid">
          {[
            { icon: Shield, title: 'OID/FHIR Identity', desc: ar ? 'خرائط هوية ممارستك' : 'Map your practice identity' },
            { icon: Building2, title: 'BPR Registry', desc: ar ? 'تقييم ملف المزود الموحد' : 'Assess your provider profile' },
            { icon: Stethoscope, title: 'Clinical AI', desc: ar ? 'جاهزية سير عمل الذكاء السريري' : 'Clinical AI workflow readiness' },
            { icon: Zap, title: 'Interoperability', desc: ar ? 'خارطة طريق التوافق الصحي السعودي' : 'Saudi healthcare interoperability roadmap' },
          ].map((f, i) => (
            <div key={i} className="sprint-feature-card">
              <f.icon size={28} className="sprint-feature-icon" />
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Upgrade Ladder */}
      <section className="sprint-upgrades">
        <h2>{ar ? 'مسار الترقية' : 'Upgrade Path'}</h2>
        <p className="sprint-upgrades-sub">
          {ar
            ? 'احجز الجلسة بـ 2,390 ريال، ثم الترقية خلال 7 أيام واحصل على رصيد كامل'
            : 'Book the session for 2,390 SAR, then upgrade within 7 days for full credit'}
        </p>
        <div className="sprint-upgrade-grid">
          {UPGRADES.map((u, i) => (
            <a key={i} href={u.url} className="sprint-upgrade-card" target="_blank" rel="noopener noreferrer">
              <div className="sprint-upgrade-header">
                <u.icon size={24} className="sprint-upgrade-icon" />
                <span className="sprint-upgrade-tier">{ar ? `الطبقة ${i + 1}` : `Tier ${i + 1}`}</span>
              </div>
              <h3>{ar ? u.nameAr : u.name}</h3>
              <p className="sprint-upgrade-price">{u.price}</p>
              <p className="sprint-upgrade-buyer">{ar ? u.buyerAr : u.buyer}</p>
              <span className="button secondary sm">{ar ? 'عرض المنتج' : 'View Product'} <ArrowRight size={14} /></span>
            </a>
          ))}
        </div>
      </section>

      {/* Trust Block */}
      <section className="sprint-trust">
        <h2>{ar ? 'لماذا BrainSAIT' : 'Why BrainSAIT'}</h2>
        <ul className="sprint-trust-list">
          {TRUST_ITEMS.map((item, i) => (
            <li key={i}>
              <CheckCircle2 size={18} className="sprint-trust-check" />
              <span>{ar ? item.ar : item.en}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Funnel CTA */}
      <section className="sprint-funnel">
        <div className="sprint-funnel-inner">
          <h2>{ar ? 'ابدأ الآن' : 'Start Now'}</h2>
          <p>
            {ar
              ? 'لا نبيع أدوات. نبني هوية صحية موثقة وجاهزية للذكاء السريري وبنية تحتية قابلة للنشر.'
              : "We don't sell tools. We build verified healthcare identity, clinical AI readiness, and deployable infrastructure."}
          </p>
          <div className="sprint-funnel-ctas">
            <a href={STRATEGY_SESSION} className="button primary" target="_blank" rel="noopener noreferrer">
              {ar ? 'احجز الجلسة — 2,390 ريال' : 'Book Session — 2,390 SAR'}
            </a>
            <a href={CALENDAR_BOOK} className="button secondary" target="_blank" rel="noopener noreferrer">
              {ar ? 'احجز مكالمة' : 'Book a Call'}
            </a>
          </div>
        </div>
      </section>

      {/* Footer note */}
      <section className="sprint-footer-note">
        <p>
          {ar
            ? 'BrainSAIT OID Root: 1.3.6.1.4.1.61026 · SCFHS الجهة الرسمية للترخيص · BrainSAIT تضيف جاهزية الهوية والتوافق'
            : 'BrainSAIT OID Root: 1.3.6.1.4.1.61026 · SCFHS remains the official licensing authority · BrainSAIT adds digital identity and interoperability readiness'}
        </p>
      </section>
    </main>
  );
}
