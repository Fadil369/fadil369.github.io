import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Rocket, Shield, Lock, Workflow, BookOpen, Calendar, BadgeCheck,
  BrainCircuit, Users, Layers, Send, CheckCircle2,
} from 'lucide-react';
import data from '../data/catalog.json';
import type { Catalog } from '../types';
import { useI18n } from '../i18n';
import { track, journeyEvent } from '../analytics';
import { usePageMeta } from '../hooks/usePageMeta';
import { GHIO_LINKS, withUtm } from '../lib/shopifyRouting';

const cat = data as unknown as Catalog;
const CALENDAR_URL = 'https://calendar.app.google/rAqiE6pNumtECdnd7';

export default function Build() {
  const { ar, t } = useI18n();
  const { program } = cat.build;

  usePageMeta({
    title: `${ar ? 'ابنِ' : 'Build'} — ${ar ? program.nameAr : program.name}`,
    description: (ar ? program.taglineAr : program.tagline) || program.name || 'BrainSAIT Build program',
    url: '/build',
    type: 'website',
  });

  // Funnel instrumentation: the BUILD offer is now visible (once per mount).
  useEffect(() => { journeyEvent('journey.offer_clicked', { location: 'page_view' }); }, []);

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
          <span className="launch-tag">{ar ? 'اختر خطتك' : 'Choose your plan'}</span>
          <span className="launch-now">{ar ? 'اشتراك شهري عبر Shopify' : 'Monthly Shopify subscription'}</span>
          <span className="launch-timer">·</span>
          <span className="launch-now">{ar ? 'تذكرة 9,630 ر.س' : 'Ticket 9,630 SAR'}</span>
        </div>
        <div className="build-hero-cta">
          <a className="button primary lg" href="#apply" onClick={() => { track('build_cta', { location: 'hero' }); journeyEvent('journey.offer_clicked', { location: 'hero' }); }}>
            {ar ? 'ابدأ طلبك' : 'Start your application'} <Rocket size={18} />
          </a>
          <a className="button secondary lg" href={CALENDAR_URL} target="_blank" rel="noopener noreferrer">
            <Calendar size={18} /> {ar ? 'احجز جلسة تقييم' : 'Book an evaluation'}
          </a>
        </div>
        <p className="fineprint">{ar ? 'كل عملية دفع تُستكمل على store.brainsait.de مع ربط الاستحقاق والتسليم هناك — أو احجز جلسة تقييم أولاً.' : 'Every payment completes on store.brainsait.de with entitlement routing and fulfillment there — or book an evaluation first.'}</p>
      </section>

      {/* ── BUILD PLANS — both routes checkout directly on Shopify ── */}
      <section id="apply" className="build-price reveal">
        <h2>{ar ? 'اختر طريقة البناء' : 'Choose how you build'}</h2>
        <p className="benefits-intro">
          {ar
            ? 'كلا المسارين يفتحان مكتبة LEARN، وNotion Forge، والعقل الثاني، وبوت Telegram، والمحاكيات العملية وخطة المتابعة.'
            : 'Both paths unlock LEARN, Notion Forge, your Second Brain, Telegram tracking, hands-on simulators, and a guided action plan.'}
        </p>
        <div className="build-tickets-row plan-choice-grid">
          <article className="build-ticket-card plan-choice-card">
            <span className="launch-badge">{ar ? 'مرن · يتجدد شهرياً' : 'Flexible · monthly'}</span>
            <div className="bt-price-row"><span className="bt-price">{ar ? 'اشتراك شهري' : 'Monthly subscription'}</span></div>
            <h3>{ar ? 'BUILD شهري' : 'BUILD Monthly'}</h3>
            <ul>
              <li>{ar ? 'كل كتب LEARN الأربعين' : 'All 40 LEARN books'}</li>
              <li>{ar ? 'Notion Forge + العقل الثاني' : 'Notion Forge + Second Brain'}</li>
              <li>{ar ? 'Brainsait_forge_bot للمتابعة والتغذية الراجعة' : 'Brainsait_forge_bot tracking and feedback'}</li>
              <li>{ar ? 'مختبرات ومحاكيات: نظرية، تطبيق، ثم إجراء' : 'Labs and simulators: theory, practice, action'}</li>
            </ul>
            <a className="button primary lg" href={withUtm(GHIO_LINKS.buildMonthly, { plan: 'build-monthly', utm_content: 'build-page' })}
               target="_blank" rel="noopener noreferrer"
               onClick={() => { track('build_cta', { location: 'monthly' }); journeyEvent('journey.offer_clicked', { location: 'monthly' }); }}>
              {ar ? 'اذهب إلى دفع Shopify الشهري' : 'Go to Shopify monthly checkout'} <Rocket size={18} />
            </a>
          </article>
          <article className="build-ticket-card plan-choice-card featured-plan">
            <span className="launch-badge">{ar ? 'تذكرة المؤسس الكاملة' : 'Complete founder ticket'}</span>
            <div className="bt-price-row"><span className="bt-price">9,630 {ar ? 'ريال' : 'SAR'}</span></div>
            <h3>{ar ? 'تذكرة BUILD' : 'BUILD Ticket'}</h3>
            <ul>
              <li>{ar ? 'رحلة مؤسس متكاملة من الفكرة إلى الإطلاق' : 'Complete founder journey from idea to launch'}</li>
              <li>{ar ? 'كل مزايا الخطة الشهرية' : 'Everything in the monthly plan'}</li>
              <li>{ar ? 'معالم إنجاز، توجيه، وشهادة رقمية' : 'Milestones, guidance, and digital certification'}</li>
              <li>{ar ? 'مسار واضح للتسويق والتخرج' : 'Structured marketing and graduation path'}</li>
            </ul>
            <a className="button secondary lg" href={withUtm(GHIO_LINKS.buildTicket, { plan: 'build-ticket', utm_content: 'build-page' })}
               target="_blank" rel="noopener noreferrer"
               onClick={() => { track('build_cta', { location: 'ticket' }); journeyEvent('journey.offer_clicked', { location: 'ticket' }); }}>
              {ar ? 'افتح دفع Shopify للتذكرة' : 'Open Shopify ticket checkout'} <Rocket size={18} />
            </a>
          </article>
          <article className="build-ticket-card plan-choice-card">
            <span className="launch-badge">{ar ? 'هوية مهنية · BPR' : 'Provider identity · BPR'}</span>
            <div className="bt-price-row"><span className="bt-price">3,960 {ar ? 'سنوي' : 'SAR/year'}</span></div>
            <h3>{ar ? 'BrainSAIT Provider Registry' : 'BrainSAIT Provider Registry'}</h3>
            <ul>
              <li>{ar ? 'الخطة السنوية افتراضية وموصى بها' : 'Annual plan is the default recommended option'}</li>
              <li>{ar ? 'شهري 163 ر.س للعامل الصحي المبتدئ' : 'Junior monthly access at 163 SAR'}</li>
              <li>{ar ? 'SPID + OID + QR + صفحة موثقة' : 'SPID + OID + QR + verified profile'}</li>
              <li>{ar ? 'مساعد سريري متعدد اللغات ووصول منظومة BrainSAIT' : 'Multilingual clinical copilot and BrainSAIT ecosystem access'}</li>
            </ul>
            <a className="button primary lg" href={withUtm(GHIO_LINKS.bpr, { plan: 'bpr', utm_content: 'build-page' })}
               target="_blank" rel="noopener noreferrer"
               onClick={() => { track('build_cta', { location: 'bpr' }); journeyEvent('journey.offer_clicked', { location: 'bpr' }); }}>
              {ar ? 'افتح عضوية BPR' : 'Open BPR membership'} <Rocket size={18} />
            </a>
          </article>
        </div>
        {/* What every BUILD plan includes — mirrors what the backend actually
            provisions (LEARN link, Notion Forge, Second Brain, Forge bot,
            simulators, guided plan + payment tracking/reminders). */}
        <ul className="build-includes-strip">
          {[
            { icon: BookOpen, label: ar ? 'مكتبة LEARN (40 كتاباً)' : 'LEARN library (40 books)' },
            { icon: Layers, label: ar ? 'صفحات Notion Forge' : 'Notion Forge pages' },
            { icon: BrainCircuit, label: ar ? 'العقل الثاني' : 'Second Brain' },
            { icon: Send, label: ar ? 'بوت Forge على Telegram' : 'Forge bot on Telegram' },
            { icon: Workflow, label: ar ? 'محاكيات عملية' : 'Hands-on simulators' },
            { icon: CheckCircle2, label: ar ? 'خطة توجيه + متابعة الدفع والتذكير' : 'Guided plan + payment tracking & reminders' },
          ].map((item, i) => (
            <li key={i}>
              <item.icon size={16} aria-hidden="true" /> <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── HOW TO JOIN — the GitHub flow ── */}
      <section className="build-register reveal">
        <h2>{ar ? 'كيف تنضم — عبر GitHub' : 'How to join — via GitHub'}</h2>
        <p className="benefits-intro">
          {ar
            ? 'المسار الجديد كله على GitHub: احجز مقعدك، ادفع السعر الموحد، وبعد الدفع يُفتح لك حسابك ومستودعك وإعدادك في Notion تلقائياً.'
            : 'The whole journey runs on GitHub: secure your seat, pay the flat price, and after payment your account, repo, and Notion onboarding are provisioned automatically.'}
        </p>

        <div className="register-steps">
          <div className="register-step">
            <span className="rs-num">1</span>
            <h3>{ar ? 'قدّم بياناتك ومقعدك' : 'Apply with your GitHub'}</h3>
            <p>
              {ar
                ? 'عبّئ النموذج أعلاه — الاسم، البريد، و<b>اسم مستخدم GitHub</b> (أنشئ حساباً مجانياً على github.com إن لم يكن لديك).'
                : 'Fill the form above — name, email, and your <b>GitHub username</b> (create a free account at github.com if you don\'t have one).'}
            </p>
          </div>
          <div className="register-step">
            <span className="rs-num">2</span>
            <h3>{ar ? 'اختر خطتك وادفع' : 'Pick your plan & pay'}</h3>
            <p>
              {ar
                ? 'تأخذك المنظومة إلى checkout في متجرنا — اشتراك شهري يتجدد تلقائياً، أو تذكرة واحدة <b>9,630 ر.س</b>.'
                : 'The system takes you to our store checkout — a renewing monthly subscription, or a one-time <b>9,630 SAR</b> ticket.'}
            </p>
          </div>
          <div className="register-step">
            <span className="rs-num">3</span>
            <h3>{ar ? 'بعد الدفع — كل شيء يُفعّل تلقائياً' : 'After payment — everything activates'}</h3>
            <p>
              {ar
                ? 'حسابك في Shopify يُنشأ عبر Partner API، صفحة الإعداد تظهر في Notion، ومستودع GitHub الخاص بك يولَّد من قالب BUILD وتُضاف إليه كمساهم.'
                : 'Your Shopify customer account is created via the Partner API, your onboarding page appears in Notion, and your own GitHub repo is generated from the BUILD starter with you added as a collaborator.'}
            </p>
          </div>
        </div>
        <div className="register-commands">
          <span className="rc-title">{ar ? 'المنظومة' : 'The chain'}</span>
          <code>GitHub</code>
          <code>Shopify Partner API</code>
          <code>Notion</code>
          <code>account.brainsait.org</code>
        </div>
      </section>

      {/* ── 14-DAY BUILD SPRINT ── */}
      <section className="build-lifecycle reveal">
        <h2>{ar ? 'سباق البناء — 16 يوماً' : 'Your build sprint — 16 days'}</h2>
        <p className="benefits-intro">
          {ar
            ? 'منهج البرنامج مصمم على 16 يوماً: أسبوع للبناء والإطلاق، وأسبوع للتسويق والتسليم، ثم التخرج والشهادة. حساب account.brainsait.org وعقلك الثاني ووصولك لـ LEARN يبقون معك — بلا انتهاء صلاحية.'
            : 'The curriculum is a focused 16-day sprint: one week to build & launch, one week for marketing & delivery, then graduation & certificate. Your account.brainsait.org access, Second Brain, and LEARN catalog stay with you — no expiry.'}
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
            <p>{ar ? 'account.brainsait.org وعقلك الثاني ومستودع GitHub الخاص بك ووصول LEARN — كلها تبقى معك.' : 'account.brainsait.org, your Second Brain, your own GitHub repo, and LEARN access all stay with you.'}</p>
          </div>
        </div>
        <p className="lifecycle-timer">
          <span className="timer-icon">⏳</span>
          {ar
            ? '16 يوماً للسباق — لكن ما تبنيه وتملكه يبقى بعده.'
            : 'A 16-day sprint — but what you build and own outlasts it.'}
        </p>
      </section>

      {/* ── THE SECOND BRAIN — GIFT & OPERATING SYSTEM ── */}
      <section className="second-brain-program reveal">
        <h2>{ar ? '🧠 عقلك الثاني — هدية كل بنّاء' : '🧠 Your Second Brain — every builder\'s gift'}</h2>
        <p className="benefits-intro">
          {ar
            ? 'إذا كانت القصة قابلة للتصديق، فالمنتج قابل للبيع. اشترِ المقعد وتملك عقلك الثاني — منصة متكاملة للتنظيم، التعلم، والإنطلاق.'
            : 'If the story is believable, the product will sell. Buy your seat and own your Second Brain — a complete platform for organization, learning, and launch.'}
        </p>
        <div className="second-brain-summary">
          <div className="sb-row">
            <span className="sb-num">16</span>
            <div>
              <h3>{ar ? 'يوماً مكثفاً' : 'intense days'}</h3>
              <p>{ar ? 'من الإشعال واختيار الفكرة حتى التخرج والعرض — منهج كامل منظم في Notion.' : 'From ignition and idea selection to graduation and the final pitch — a complete curriculum, organized in Notion.'}</p>
            </div>
          </div>
          <div className="sb-row">
            <span className="sb-num">16</span>
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
              <h3>{ar ? 'مستودع GitHub خاص بك' : 'your own GitHub repo'}</h3>
              <p>{ar ? 'بعد الدفع يولَّد مستودعك الخاص من قالب BUILD وتُضاف إليه كمساهم — تبدأ من مرجع تملكه، لا من الصفر.' : 'After payment your own repo is generated from the BUILD starter and you are added as a collaborator — you start from a reference you own, not from zero.'}</p>
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

      {/* ── REAL TOOLS STACK ── */}
      <section className="build-security reveal">
        <h2>{ar ? '🧰 الأدوات الحقيقية — لا قائمة تسويقية' : '🧰 The real tools — not a marketing list'}</h2>
        <p className="benefits-intro">
          {ar
            ? 'لا تتعلم عن هذه الأدوات — تتعلم عليها، داخل نظام BrainSAIT الحي نفسه الذي يخدم عملاء حقيقيين الآن.'
            : "You don't learn about these tools — you learn on them, inside the live BrainSAIT system that serves real customers right now."}
        </p>
        <div className="lifecycle-track">
          <div className="lifecycle-phase wk1">
            <span className="lc-flag">{ar ? 'التطوير والبنية' : 'Dev & Infra'}</span>
            <p>GitHub · Cloudflare Workers/KV/R2/DNS · Linux Ubuntu Server · Bash · Docker</p>
          </div>
          <div className="lifecycle-phase wk2">
            <span className="lc-flag">{ar ? 'الذكاء والأتمتة' : 'AI & Automation'}</span>
            <p>Claude Code · MCP · AI Agents · n8n · Hermes · Cron</p>
          </div>
          <div className="lifecycle-phase grad">
            <span className="lc-flag">{ar ? 'البيانات والمحتوى' : 'Data & Content'}</span>
            <p>Airtable · Canva · Notion</p>
          </div>
          <div className="lifecycle-phase exp">
            <span className="lc-flag">{ar ? 'التجارة والتواصل' : 'Commerce & Comms'}</span>
            <p>Shopify · Resend · Notion · WhatsApp Business</p>
          </div>
        </div>
        <p className="fineprint" style={{ marginTop: 16 }}>
          {ar
            ? '📱 على جهازك: Apple Shortcuts وAutomator تُدرّسان عملياً على جهاز Mac/iPhone حقيقي أثناء المختبر — لا يمكن محاكاتهما من خادم، ولن ندّعي إثباتاً لا نملكه.'
            : "📱 On your device: Apple Shortcuts and Automator are taught hands-on on a real Mac/iPhone during the lab — they can't run on a server, and we won't fake a screenshot we don't have."}
        </p>
        <p className="fineprint">
          {ar
            ? 'كل أداة مرتبطة مباشرة بكتالوج LEARN (37 مصدراً) وSOLUTIONS (37 عرضاً حياً) — تبدأ من مرجع تملكه، لا من الصفر.'
            : 'Every tool cross-references the LEARN catalog (37 resources) and SOLUTIONS (37 live demos) — you start from a reference you own, not from zero.'}
        </p>
      </section>

      <section className="program-info reveal">
        <p>{ar ? program.descriptionAr : program.description}</p>
        <Link className="button secondary" to="/solutions">{t('program.pick')}</Link>
      </section>
    </main>
  );
}
