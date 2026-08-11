import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Rocket, Shield, Lock, Workflow, BookOpen, Calendar, BadgeCheck,
  BrainCircuit, Sparkles, Target, Users, CloudCog, Store, ArrowLeft,
  CheckCircle2, Zap,
} from 'lucide-react';
import data from '../data/catalog.json';
import type { Catalog } from '../types';
import { useI18n, money } from '../i18n';
import { track } from '../analytics';

const cat = data as unknown as Catalog;
const PROMO_API = 'https://forge.brainsait.org';
const CALENDAR_URL = 'https://calendar.app.google/rAqiE6pNumtECdnd7';

export default function Build() {
  const { ar, t } = useI18n();
  const { program } = cat.build;
  const [promo, setPromo] = useState('');
  const [promoState, setPromoState] = useState<{ checking?: boolean; ok?: boolean; error?: string; discount?: number; price?: number }>({});

  const standardPrice = program.standardPrice ?? 14900;
  const offerPrice = program.offerPrice ?? program.price ?? 9630;

  const displayedPrice = useMemo(() => {
    if (promoState.ok && promoState.price != null) return promoState.price;
    return offerPrice;
  }, [promoState, offerPrice]);

  const savingsPct = promoState.ok && promoState.discount
    ? promoState.discount
    : Math.round((1 - offerPrice / standardPrice) * 100);

  const checkPromo = async () => {
    const code = promo.trim();
    if (!code) { setPromoState({ error: ar ? 'أدخل رمز الخصم' : 'Enter a promo code' }); return; }
    setPromoState({ checking: true });
    track('promo_attempt', { code });
    try {
      const r = await fetch(`${PROMO_API}/promo/price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, base: offerPrice }),
      });
      const d = await r.json();
      if (d.ok) {
        setPromoState({ ok: true, discount: d.discount_percent, price: d.final_price });
        track('promo_valid', { code, discount: d.discount_percent });
      } else {
        setPromoState({ error: d.error || ar ? 'رمز غير صالح' : 'Invalid code' });
      }
    } catch {
      setPromoState({ error: ar ? 'تعذر الاتصال' : 'Could not reach validation' });
    }
  };

  const onPay = () =>
    track('begin_checkout', {
      currency: 'SAR',
      value: displayedPrice,
      items: [{ item_id: program.slug, item_name: program.name, price: displayedPrice }],
    });

  const journey = [
    { icon: Sparkles, t: ar ? 'اليوم 0 · الانطلاق' : 'Day 0 · Ignition', d: ar ? 'الفكرة، لوحة الليّن، اختيار التقنية' : 'Idea, lean canvas, stack selection' },
    { icon: Target, t: ar ? 'اليوم 1 · التحديد' : 'Day 1 · Define', d: ar ? 'PRD، UX، العمارة، معايير القبول' : 'PRD, UX, architecture, acceptance criteria' },
    { icon: Workflow, t: ar ? 'اليوم 2 · البناء' : 'Day 2 · Build', d: ar ? 'GitHub، الوكلاء، Cloudflare، Shopify' : 'GitHub, agents, Cloudflare, Shopify' },
    { icon: CloudCog, t: ar ? 'اليوم 3 · الدمج' : 'Day 3 · Integrate', d: ar ? 'الـAPIs، الأتمتة، الدفع، التحليلات' : 'APIs, automation, payments, analytics' },
    { icon: BadgeCheck, t: ar ? 'اليوم 4 · التحقق' : 'Day 4 · Validate', d: ar ? 'QA، الأمان، الأداء، اختبار المستخدم' : 'QA, security, performance, user testing' },
    { icon: Rocket, t: ar ? 'اليوم 5 · الإطلاق' : 'Day 5 · Launch', d: ar ? 'الإنتاج، DNS، البريد، التسويق، المراقبة' : 'Production, DNS, email, marketing, monitoring' },
  ];

  const securityPoints = [
    { icon: Shield, t: ar ? 'بوابات موافقة' : 'Approval gates', d: ar ? 'لا شيء يُطلق تلقائياً — الأوامر الحساسة تحتاج تأكيد المؤسس/الإدارة' : 'Nothing launches autonomously — sensitive actions need founder/admin confirmation' },
    { icon: Lock, t: ar ? 'إدارة سرية آمنة' : 'Secure secret handling', d: ar ? 'الرموز تُدار في n8n Credentials — لا تُخزَّن مفاتيح في Airtable أو Git' : 'Tokens live in n8n Credentials — no keys in Airtable or Git' },
    { icon: Users, t: ar ? 'أدوار واضحة' : 'Clear roles', d: ar ? 'مؤسس · مرشد · إدارة · وكيل — لكل دور صلاحياته' : 'Founder · Mentor · Admin · Agent — each with scoped powers' },
    { icon: BookOpen, t: ar ? 'سجل تدقيق كامل' : 'Full audit trail', d: ar ? 'كل حدث مسجّل في Forge Events — من الفكرة إلى الإطلاق' : 'Every event logged in Forge Events — idea to launch' },
    { icon: Workflow, t: ar ? 'تراجع آمن' : 'Safe rollback', d: ar ? 'نشر مع اختبارات دخان وإمكانية تراجع فورية' : 'Deploys with smoke tests and instant rollback' },
    { icon: BrainCircuit, t: ar ? 'ذكاء خاضع للتحكم' : 'Controlled autonomy', d: ar ? 'المسارات 🟢 مستقلة، 🟡 تحتاج موافقة، 🔴 تحتاج تأكيداً' : '🟢 autonomous · 🟡 approval · 🔴 founder-confirm' },
  ];

  return (
    <main className="page build-page">
      {/* ── HERO ── */}
      <section className="build-hero reveal">
        <span className="hero-eyebrow"><span className="dot" /> {ar ? 'برنامج الاحتضان' : 'The Incubation Program'}</span>
        <h1>{ar ? program.nameAr : program.name}</h1>
        <p className="lede">{ar ? program.taglineAr : program.tagline}</p>
        <div className="build-hero-cta">
          <a className="button primary lg" href={program.shopifyUrl}
             target="_blank" rel="noopener noreferrer" onClick={onPay}>
            {ar ? 'سجّل الآن' : 'Join now'} <Rocket size={18} />
          </a>
          <a className="button secondary lg" href={CALENDAR_URL} target="_blank" rel="noopener noreferrer">
            <Calendar size={18} /> {ar ? 'احجز جلسة تقييم' : 'Book an evaluation'}
          </a>
        </div>
        <p className="fineprint">{ar ? 'دفع آمن عبر PayPal على store.brainsait.org' : 'Secure PayPal checkout on store.brainsait.org'}</p>
      </section>

      {/* ── HOW TO REGISTER VIA TELEGRAM ── */}
      <section className="build-register reveal">
        <h2>{ar ? 'كيف تسجّل عبر تيليغرام' : 'How to register via Telegram'}</h2>
        <p className="benefits-intro">
          {ar
            ? 'أرسل رسالة إلى البوت الرسمي واتبع 3 خطوات فقط — كل شيء شفاف ومباشر.'
            : 'Message the official bot and follow just 3 steps — everything is clear and direct.'}
        </p>
        <div className="register-steps">
          <div className="register-step">
            <span className="rs-num">1</span>
            <h3>{ar ? 'افتح البوت' : 'Open the bot'}</h3>
            <p>
              {ar
                ? 'ابحث في تيليغرام عن <b>@BrainSAITForgeBot</b> واضغط Start، أو اضغط الزر أدناه.'
                : 'Search <b>@BrainSAITForgeBot</b> on Telegram and press Start, or tap the button below.'}
            </p>
            <a className="button primary sm" href="https://t.me/BrainSAITForgeBot" target="_blank" rel="noopener noreferrer">
              {ar ? 'افتح البوت' : 'Open @BrainSAITForgeBot'} ↗
            </a>
          </div>
          <div className="register-step">
            <span className="rs-num">2</span>
            <h3>{ar ? 'أرسل /start' : 'Send /start'}</h3>
            <p>
              {ar
                ? 'البوت يحفظ معرّف تيليغرام الخاص بك كمعرّف مؤسس. ثم أنشئ مشروعك بـ <code>/startup &lt;اسم المشروع&gt;</code>.'
                : 'The bot saves your Telegram ID as your founder ID. Then create your startup with <code>/startup &lt;name&gt;</code>.'}
            </p>
          </div>
          <div className="register-step">
            <span className="rs-num">3</span>
            <h3>{ar ? 'قدّم يومياً' : 'Ship daily'}</h3>
            <p>
              {ar
                ? 'استخدم <code>/day</code> للتقدم، و<code>/standup</code> و<code>/blocker</code> للتحديثات، و<code>/coach</code> لاستشارة الذكاء الاصطناعي، و<code>/launch</code> عند الإطلاق.'
                : 'Use <code>/day</code> to advance, <code>/standup</code> & <code>/blocker</code> for updates, <code>/coach</code> for AI advice, and <code>/launch</code> when ready.'}
            </p>
          </div>
        </div>
        <div className="register-commands">
          <span className="rc-title">{ar ? 'الأوامر' : 'Commands'}</span>
          {['/start', '/startup', '/day', '/status', '/standup', '/blocker', '/score', '/coach', '/promo', '/launch', '/help'].map((c) => (
            <code key={c}>{c}</code>
          ))}
        </div>
        <p className="fineprint">
          {ar
            ? 'المسار كله مدعوم بـ Cloudflare Worker AI + AI Gateway — مجاني ودائم، مع توجيه ذكي وتقييم فوري.'
            : 'The whole journey runs on Cloudflare Worker AI + AI Gateway — free & permanent, with smart coaching and instant scoring.'}
        </p>
      </section>

      {/* ── PRICING CARD ── */}
      <section className="build-price reveal">
        <div className="price-card">
          <span className="price-badge">{ar ? 'عرض لفترة محدودة' : 'Limited-time offer'}</span>
          <div className="price-row">
            <span className="price-was">{money(standardPrice, ar)}</span>
            <span className="price-now">{money(offerPrice, ar)}</span>
          </div>
          <p className="price-note">
            {ar
              ? `السعر القياسي ${money(standardPrice, ar)} — الآن ${money(offerPrice, ar)} لمدة محدودة`
              : `Standard ${money(standardPrice, ar)} — now ${money(offerPrice, ar)} for a limited time`}
          </p>
          <div className="price-off">−{savingsPct}%</div>

          <div className="promo-box">
            <label>{ar ? 'لديك رمز خصم؟' : 'Have a promo code?'}</label>
            <div className="promo-row">
              <input
                value={promo}
                onChange={(e) => { setPromo(e.target.value); setPromoState({}); }}
                placeholder={ar ? 'مثال: FORGE-XXXXXX' : 'e.g. FORGE-XXXXXX'}
              />
              <button className="button secondary" onClick={checkPromo} disabled={promoState.checking}>
                {promoState.checking ? '…' : ar ? 'تحقق' : 'Apply'}
              </button>
            </div>
            {promoState.ok && (
              <p className="promo-ok">
                <CheckCircle2 size={14} /> {ar ? `خصم ${promoState.discount}% — السعر ${money(displayedPrice, ar)}` : `${promoState.discount}% off — ${money(displayedPrice, ar)}`}
              </p>
            )}
            {promoState.error && <p className="promo-err">{promoState.error}</p>}
            <a className="promo-link" href={CALENDAR_URL} target="_blank" rel="noopener noreferrer">
              <Sparkles size={12} /> {ar ? 'احجز معي لتقييم خصمك — اضغط هنا' : 'Book with me to evaluate your discount — press here'}
            </a>
          </div>

          <a className="button primary lg price-pay" href={program.shopifyUrl}
             target="_blank" rel="noopener noreferrer" onClick={onPay}>
            {ar ? `ادفع ${money(displayedPrice, ar)} الآن` : `Pay ${money(displayedPrice, ar)} now`} <ArrowLeft size={18} />
          </a>
          <p className="fineprint">
            {ar
              ? 'عند الموافقة على حالتك سيصلك رمز تفعيل — فعّل حسابك لتطبيق الخصم'
              : 'Once your case is approved you\'ll receive an activation code — activate your account to apply the discount'}
          </p>
        </div>
      </section>

      {/* ── OVERVIEW / WHAT YOU BUILD ── */}
      <section className="build-overview reveal">
        <h2>{ar ? 'رحلتك خلال 5 أيام' : 'Your 5-day journey'}</h2>
        <p className="benefits-intro">
          {ar
            ? 'من فكرة خام إلى منتج مُطلق — منهج موجه خطوة بخطوة، مع تقييمات ذكية وإرشاد.'
            : 'From raw idea to shipped product — a guided, step-by-step method with smart scoring and mentorship.'}
        </p>
        <div className="journey-grid">
          {journey.map((s, i) => (
            <div key={i} className="journey-card">
              <span className="journey-day">DAY {i}</span>
              <s.icon size={22} className="journey-icon" />
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
        <div className="forge-teaser-inline">
          <p>
            <strong>{ar ? 'Powered by Launch Forge' : 'Powered by Launch Forge'}</strong> — {ar
              ? 'منصة الإطلاق الداخلية: نقاط جاهزية، إرشاد ذكي، وإطلاق مُراقب.'
              : 'our internal build engine: readiness scoring, smart mentorship, supervised launch.'}
            {' '}
            <a href="https://forge.brainsait.org" target="_blank" rel="noopener noreferrer">
              forge.brainsait.org ↗
            </a>
          </p>
        </div>
      </section>

      {/* ── 14-DAY ACCOUNT LIFECYCLE ── */}
      <section className="build-lifecycle reveal">
        <h2>{ar ? 'دورة حسابك — 14 يوماً' : 'Your account cycle — 14 days'}</h2>
        <p className="benefits-intro">
          {ar
            ? 'حساب البرنامج صالح لـ 14 يوماً فقط: أسبوع للبناء والإطلاق، وأسبوع للتسويق والتسليم، ثم التخرج والشهادة — وينتهي الوصول.'
            : 'Your program account is valid for just 14 days: one week to build & launch, one week for marketing & delivery, then graduation & certificate — then access expires.'}
        </p>
        <div className="lifecycle-track">
          <div className="lifecycle-phase wk1">
            <span className="lc-flag">{ar ? 'الأسبوع 1' : 'Week 1'}</span>
            <h3>{ar ? 'البناء والإطلاق' : 'Build & Launch'}</h3>
            <p>{ar ? 'اليوم 0→5: رحلة Forge — من الفكرة إلى إطلاق المنتج. إطلاق في نهاية الأسبوع الأول.' : 'Day 0→5: the Forge journey — idea to shipped product. Launch at the end of week one.'}</p>
          </div>
          <div className="lifecycle-phase wk2">
            <span className="lc-flag">{ar ? 'الأسبوع 2' : 'Week 2'}</span>
            <h3>{ar ? 'التسويق والتسليم' : 'Marketing & Delivery'}</h3>
            <p>{ar ? 'خطة تسويق، إطلاق القنوات، وتسليم المشروع للعميل.' : 'Marketing plan, channel launch, and project delivery to your customer.'}</p>
          </div>
          <div className="lifecycle-phase grad">
            <span className="lc-flag">{ar ? 'التخرج' : 'Graduation'}</span>
            <h3>{ar ? 'شهادة الإتمام' : 'Completion certificate'}</h3>
            <p>{ar ? 'شهادة رسمية عند الإتمام — ثم يُغلق الوصول.' : 'Official certificate on completion — then access is closed.'}</p>
          </div>
          <div className="lifecycle-phase exp">
            <span className="lc-flag">{ar ? 'الانتهاء' : 'Expiry'}</span>
            <h3>{ar ? 'انتهاء صلاحية الحساب' : 'Account expires'}</h3>
            <p>{ar ? 'بعد 14 يوماً ينتهي وصول حسابك تلقائياً.' : 'After 14 days your account access automatically expires.'}</p>
          </div>
        </div>
        <p className="lifecycle-timer">
          <span className="timer-icon">⏳</span>
          {ar
            ? '14 يوماً فقط — البناء، الإطلاق، التسويق، التسليم، والتخرج.'
            : 'Just 14 days — build, launch, market, deliver, graduate.'}
        </p>
      </section>

      {/* ── SECURITY & POLICY ── */}
      <section className="build-security reveal">
        <h2>{ar ? 'الأمان والسياسات' : 'Security & Policy'}</h2>
        <p className="benefits-intro">
          {ar
            ? 'الاحتضان يُدار بمستوى إنتاجي — بوابات، تدقيق، وضوابط.'
            : 'The incubator runs at production-grade — gates, audit, and controls.'}
        </p>
        <div className="security-grid">
          {securityPoints.map((s, i) => (
            <div key={i} className="security-card">
              <s.icon size={20} className="sec-icon" />
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
        <div className="policy-note">
          <Lock size={16} />
          <p>
            {ar
              ? 'سياسة الخصوصية: لا تُشارك بياناتك أو رموزك مع أي طرف ثالث. رموز الخصم شخصية ومرتبطة ببريدك، وتُفعَّل مرة واحدة فقط.'
              : 'Privacy: your data and codes are never shared with third parties. Promo codes are personal, tied to your email, and activate once.'}
          </p>
        </div>
      </section>

      {/* ── INCLUDED / BENEFITS ── */}
      <section className="program-benefits reveal">
        <h2>{ar ? 'ما الذي ستحصل عليه' : "What you get"}</h2>
        <div className="benefits-grid">
          {[
            { icon: '🎯', en: 'Cohort-based', arLabel: 'دفعة مركزة' },
            { icon: '🧭', en: 'Mentored build', arLabel: 'بناء موجّه' },
            { icon: '🚀', en: 'Ship a real product', arLabel: 'أطلق منتجاً حقيقياً' },
            { icon: '🛡️', en: 'Production-grade infra', arLabel: 'بنية إنتاجية' },
            { icon: '🤖', en: 'AI coach & scoring', arLabel: 'مدرب ذكي وتقييم' },
            { icon: '🌐', en: 'Cloudflare + Shopify + GitHub', arLabel: 'تكديس تقني متكامل' },
          ].map((b, i) => (
            <div key={i} className="benefit-card">
              <div className="benefit-icon">{b.icon}</div>
              <h3>{ar ? b.arLabel : b.en}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="program-info reveal">
        <p>{ar ? program.descriptionAr : program.description}</p>
        <Link className="button secondary" to="/solutions">{t('program.pick')}</Link>
      </section>
    </main>
  );
}
