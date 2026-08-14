import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Rocket, Shield, Lock, Workflow, BookOpen, Calendar, BadgeCheck,
  BrainCircuit, Sparkles, Target, Users, CloudCog, Store,
} from 'lucide-react';
import data from '../data/catalog.json';
import type { Catalog } from '../types';
import { useI18n } from '../i18n';
import { track } from '../analytics';
import BuildEligibilityForm from '../components/BuildEligibilityForm';

const cat = data as unknown as Catalog;
const PROMO_API = 'https://forge.brainsait.org';
const CALENDAR_URL = 'https://calendar.app.google/rAqiE6pNumtECdnd7';
const FORGE_TOKEN_KEY = 'bs_forge_token';
const FORGE_PROFILE_KEY = 'bs_forge_profile';

export default function Build() {
  const { ar, t } = useI18n();
  const { program } = cat.build;
  const [tgLogin, setTgLogin] = useState<{ ok?: boolean; founder_id?: string; name?: string; error?: string }>({});

  // Telegram Login Widget — one-click founder registration.
  useEffect(() => {
    const tgBtn = document.getElementById('telegram-login-btn');
    if (!tgBtn || (window as any).TelegramLoginWidgetLoaded) return;
    (window as any).TelegramLoginWidgetLoaded = true;
    (window as any).onTelegramAuth = (user: any) => {
      setTgLogin({ checking: true } as any);
      fetch(`${PROMO_API}/forge/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth: user }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d && d.ok) {
            setTgLogin({ ok: true, founder_id: d.founder_id, name: d.name || user.first_name });
            track('tg_login', { founder_id: d.founder_id });
            // Persist the forge (OID) identity so the Account page can
            // resolve the same profile across the ecosystem.
            try {
              if (d.token) localStorage.setItem(FORGE_TOKEN_KEY, d.token);
              localStorage.setItem(FORGE_PROFILE_KEY, JSON.stringify(d.profile || {}));
            } catch { /* ignore */ }
          } else {
            setTgLogin({ error: d?.error || 'login failed' });
          }
        })
        .catch(() => setTgLogin({ error: 'network error' }));
    };
    const s = document.createElement('script');
    s.src = 'https://telegram.org/js/telegram-widget.js?22';
    s.async = true;
    s.setAttribute('data-telegram-login', 'brainsait_forge_bot');
    s.setAttribute('data-size', 'large');
    s.setAttribute('data-radius', '12');
    s.setAttribute('data-request-access', 'write');
    s.setAttribute('data-userpic', 'false');
    s.setAttribute('data-onauth', 'onTelegramAuth');
    tgBtn.appendChild(s);
  }, []);

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
        <div className="build-launch-strip">
          <span className="launch-tag">{ar ? 'عرض الإطلاق' : 'Launch offer'}</span>
          <span className="launch-was">{ar ? 'كان' : 'Was'} 14,960 SAR</span>
          <span className="launch-now">{ar ? 'الآن' : 'Now'} 9,630 SAR</span>
          <span className="launch-timer">{ar ? 'لفترة محدودة' : 'Limited time'}</span>
        </div>
        <div className="build-hero-cta">
          <a className="button primary lg" href="#apply" onClick={() => track('build_cta', { location: 'hero' })}>
            {ar ? 'ابدأ طلبك' : 'Start your application'} <Rocket size={18} />
          </a>
          <a className="button secondary lg" href={CALENDAR_URL} target="_blank" rel="noopener noreferrer">
            <Calendar size={18} /> {ar ? 'احجز جلسة تقييم' : 'Book an evaluation'}
          </a>
        </div>
        <p className="fineprint">{ar ? 'دفع آمن عبر PayPal على store.brainsait.org — أدخل رمز الخصم قبل الدفع، أو احجز جلسة تقييم أولاً.' : 'Secure PayPal checkout on store.brainsait.org — apply your promo code before checkout, or book an evaluation first.'}</p>
      </section>

      {/* ── ELIGIBILITY & APPLICATION FORM ── */}
      <section id="apply" className="build-price reveal">
        <BuildEligibilityForm />
      </section>

      {/* ── HOW TO REGISTER VIA TELEGRAM ── */}
      <section className="build-register reveal">
        <h2>{ar ? 'كيف تسجّل عبر تيليغرام' : 'How to register via Telegram'}</h2>
        <p className="benefits-intro">
          {ar
            ? 'سجّل دخولك بنقرة واحدة عبر تيليغرام، أو اتبع 3 خطوات مع البوت — كل شيء شفاف ومباشر.'
            : 'Log in with one click via Telegram, or follow 3 steps with the bot — everything is clear and direct.'}
        </p>

        {/* One-click Telegram Login */}
        <div className="tg-login-box">
          <p className="tg-login-title">{ar ? 'تسجيل دخول فوري بنقرة واحدة' : 'Instant one-click login'}</p>
          <div id="telegram-login-btn"></div>
          {tgLogin.ok ? (
            <p className="tg-login-ok">✅ {ar
              ? `مرحباً ${tgLogin.name} — تم ربط هوية تيليغرام وحسابك (${tgLogin.founder_id}) جاهز للمزامنة عبر البيئة. فعّل مقعدك من صفحة البناء أدناه.`
              : `Welcome ${tgLogin.name} — your Telegram identity is linked (${tgLogin.founder_id}) and synced across the ecosystem. Activate your seat via the build form below.`}</p>
          ) : tgLogin.error ? (
            <p className="tg-login-err">⚠️ {tgLogin.error}</p>
          ) : (
            <p className="tg-login-note">
              {ar
                ? 'اضغط الزر أعلاه — سنتحقق من هويتك ونسجّل حسابك تلقائياً. (الزر يظهر بعد تحميل أداة تيليغرام)'
                : 'Tap the button above — we verify your identity and register your account automatically. (The button appears once Telegram\'s widget loads.)'}
            </p>
          )}
        </div>

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

      {/* ── 14-DAY BUILD SPRINT ── */}
      <section className="build-lifecycle reveal">
        <h2>{ar ? 'سباق البناء — 14 يوماً' : 'Your build sprint — 14 days'}</h2>
        <p className="benefits-intro">
          {ar
            ? 'منهج البرنامج مصمم على 14 يوماً: أسبوع للبناء والإطلاق، وأسبوع للتسويق والتسليم، ثم التخرج والشهادة. حساب account.brainsait.org وعقلك الثاني ووصولك لـ LEARN يبقون معك — بلا انتهاء صلاحية.'
            : 'The curriculum is a focused 14-day sprint: one week to build & launch, one week for marketing & delivery, then graduation & certificate. Your account.brainsait.org access, Second Brain, and LEARN catalog stay with you — no expiry.'}
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
            <p>{ar ? 'شهادة رسمية دائمة عند إتمام الـ16 مرحلة.' : 'A permanent official certificate once all 16 milestones are complete.'}</p>
          </div>
          <div className="lifecycle-phase exp">
            <span className="lc-flag">{ar ? 'بعد التخرج' : 'After graduation'}</span>
            <h3>{ar ? 'حسابك يبقى نشطاً' : 'Your account stays active'}</h3>
            <p>{ar ? 'account.brainsait.org وعقلك الثاني وبوت تيليغرام ووصول LEARN — كلها تبقى معك.' : 'account.brainsait.org, your Second Brain, the Telegram bot, and LEARN access all stay with you.'}</p>
          </div>
        </div>
        <p className="lifecycle-timer">
          <span className="timer-icon">⏳</span>
          {ar
            ? '14 يوماً للسباق — لكن ما تبنيه وتملكه يبقى بعده.'
            : 'A 14-day sprint — but what you build and own outlasts it.'}
        </p>
      </section>

      {/* ── THE SECOND BRAIN — GIFT & OPERATING SYSTEM ── */}
      <section className="second-brain-program reveal">
        <h2>{ar ? '🧠 عقلك الثاني — هدية كل بنّاء' : '🧠 Your Second Brain — every builder\'s gift'}</h2>
        <p className="benefits-intro">
          {ar
            ? 'إذا كانت القصة قابلة للتصديق، فالمنتج قابل للبيع. اشترِ المقعد وتملك عقلك الثاني — إثباتنا أنك استخدمت عقلك الأول جيداً، ولهذا أنت هنا.'
            : 'If the story is believable, the product will sell. Buy your seat and own your Second Brain — our proof that you used your first one very well, and that is why you are here.'}
        </p>
        <div className="second-brain-summary">
          <div className="sb-row">
            <span className="sb-num">15</span>
            <div>
              <h3>{ar ? 'يوماً مكثفاً' : 'intense days'}</h3>
              <p>{ar ? 'من الإشعال واختيار الفكرة حتى التخرج والعرض — منهج كامل منظم في Notion.' : 'From ignition and idea selection to graduation and the final pitch — a complete curriculum, organized in Notion.'}</p>
            </div>
          </div>
          <div className="sb-row">
            <span className="sb-num">18</span>
            <div>
              <h3>{ar ? 'مختبراً عملياً' : 'hands-on labs'}</h3>
              <p>{ar ? 'مختبرات حقيقية خطوة بخطوة: متجر، دفع، تسليم آلي، تحليلات، أمن، ذكاء اصطناعي.' : 'Real step-by-step labs: store, payments, automated delivery, analytics, security, AI.'}</p>
            </div>
          </div>
          <div className="sb-row">
            <span className="sb-num">16</span>
            <div>
              <h3>{ar ? 'معلم إنجاز' : 'milestones'}</h3>
              <p>{ar ? 'معالم مسجلة لك في قاعدة Build Milestones — كل يوم ترفع الحالة وتضع دليل إنجازك (Proof URL).' : 'Milestones recorded in the Build Milestones database — every day you advance the status and attach your proof URL.'}</p>
            </div>
          </div>
          <div className="sb-row">
            <span className="sb-num">1</span>
            <div>
              <h3>{ar ? 'بوت مرافق من التسجيل حتى الشهادة' : 'companion bot — registration to certificate'}</h3>
              <p>{ar ? '@BrainSAITForgeBot يتابعك، يذكّرك بوقفة اليوم، يقيّم تقدمك، ويصدر شهادتك عند الإتمام.' : '@BrainSAITForgeBot tracks you, reminds you of your daily standup, scores your progress, and issues your certificate on completion.'}</p>
            </div>
          </div>
          <div className="sb-row">
            <span className="sb-num">∞</span>
            <div>
              <h3>{ar ? 'وصول كامل لمكتبة LEARN' : 'full LEARN catalog access'}</h3>
              <p>{ar ? 'كل مصدر تعليمي مفتوح في LEARN يُفتح لك مجاناً — بلا حدود، بلا انتهاء.' : 'Every open learning resource on LEARN unlocked for you — free, unlimited, no expiry.'}</p>
            </div>
          </div>
          <div className="sb-row">
            <span className="sb-num">1</span>
            <div>
              <h3>{ar ? 'حساب عميل دائم' : 'a permanent customer account'}</h3>
              <p>{ar ? 'account.brainsait.org — تتبّع تقدمك، شهاداتك، وتنزيلاتك في مكان واحد، طوال الوقت.' : 'account.brainsait.org — track your progress, certificates, and downloads in one place, for good.'}</p>
            </div>
          </div>
        </div>
        <div className="sb-cert">
          <BadgeCheck size={20} />
          <p>
            {ar
              ? 'عند اكتمال المعالم الـ16 يُصدر لك نظام الشهادات الآلي شهادة رقمية فاخرة باسمك — ويُرسلها لبريدك مع رابط عقلك الثاني الكامل.'
              : 'When all 16 milestones are complete, the automated certificate system issues a premium digital certificate in your name — and emails it with the full Second Brain link.'}
          </p>
        </div>
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
