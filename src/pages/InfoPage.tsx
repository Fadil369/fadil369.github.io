import { useI18n } from '../i18n';
import { usePageMeta } from '../hooks/usePageMeta';

type Info = { en: [string, string][]; ar: [string, string][]; titleEn: string; titleAr: string; metaEn: string; metaAr: string };

const PAGES: Record<string, Info> = {
  faq: {
    titleEn: 'FAQ — Q&A', titleAr: 'الأسئلة الشائعة',
    metaEn: 'Frequently asked questions about BrainSAIT LEARN, BUILD and SOLUTION.', metaAr: 'أسئلة شائعة حول LEARN و BUILD و SOLUTION.',
    en: [
      ['LEARN Monthly', '182 SAR/mo — all 40 digital books online via Frame.io, renewed monthly.'],
      ['Single book?', 'Yes, 99 SAR one-time per book, instant PDF download from R2.'],
      ['BUILD', 'Forge incubator: 16-day program, Notion courses, 2nd Brain, Telegram bot tracking. Monthly 499 SAR or one-time 9,630 SAR ticket.'],
      ['SOLUTION', 'Pre-built software deployed to your infra (24,000 SAR one-time) or Super-Partner monthly (1,999 SAR) with Lark org setup.'],
      ['Payments', 'Secure checkout on store.brainsait.de (MyFatoorah / PayPal). Prices in SAR.'],
    ],
    ar: [
      ['LEARN الشهري', '182 ر.س/شهر — جميع الكتب الـ40 أونلاين عبر Frame.io، يتجدد شهرياً.'],
      ['كتاب واحد؟', 'نعم، 99 ر.س لمرة واحدة، تحميل فوري PDF من R2.'],
      ['BUILD', 'حاضنة Forge: برنامج 16 يوماً، دورات Notion، العقل الثاني، تتبع بوت تليجرام. شهري 499 ر.س أو تذكرة 9,630 ر.س.'],
      ['SOLUTION', 'برمجيات جاهزة تُنشر على بنيتك (24,000 ر.س) أو شريك مميز شهري (1,999 ر.س) مع إعداد Lark.'],
      ['الدفع', 'دفع آمن على store.brainsait.de (MyFatoorah / PayPal)، الأسعار بالريال.'],
    ],
  },
  terms: {
    titleEn: 'Terms of Service', titleAr: 'شروط الخدمة',
    metaEn: 'BrainSAIT Terms of Service for digital products, subscriptions and privacy.', metaAr: 'شروط خدمة برينسايت للمنتجات الرقمية والاشتراكات والخصوصية.',
    en: [
      ['1. Digital Products', 'LEARN books, BUILD program access and SOLUTION software are delivered digitally. Access is personal and non-transferable.'],
      ['2. Subscriptions', 'Monthly plans renew automatically each billing cycle. Cancel anytime before the next cycle.'],
      ['3. Refunds', 'Digital products are non-refundable once delivered. For one-time SOLUTION purchases, contact support to arrange setup.'],
      ['4. Privacy', 'Your data is used only to deliver purchases and improve services, aligned with Saudi PDPL.'],
    ],
    ar: [
      ['1. المنتجات الرقمية', 'تُسلم كتب LEARN وبرنامج BUILD وحلول SOLUTION رقمياً، والوصول شخصي وغير قابل للتحويل.'],
      ['2. الاشتراكات', 'تتجدد الخطط الشهرية تلقائياً، ويمكنك الإلغاء قبل الدورة التالية.'],
      ['3. الاسترداد', 'المنتجات الرقمية غير قابلة للاسترداد بعد التسليم.'],
      ['4. الخصوصية', 'تُستخدم بياناتك فقط لتسليم مشترياتك، بما يتوافق مع نظام حماية البيانات الشخصية السعودي.'],
    ],
  },
  support: {
    titleEn: 'Support', titleAr: 'الدعم',
    metaEn: 'BrainSAIT support — order & access help, contact details.', metaAr: 'دعم برينسايت — مساعدة الطلبات والوصول، تفاصيل التواصل.',
    en: [
      ['Contact', 'Email us: hello@brainsait.de'],
      ['Order & Access', "Didn't get your download link or Frame.io access? Check spam or email us with your order number."],
      ['Account', 'Track orders and subscriptions in your account.'],
    ],
    ar: [
      ['التواصل', 'راسلنا: hello@brainsait.de'],
      ['الطلبات والوصول', 'إن لم تصلك روابط التحميل، راجع مجلد المهملات أو راسلنا مع رقم طلبك.'],
      ['الحساب', 'تابع طلباتك واشتراكاتك في حسابك.'],
    ],
  },
  contact: {
    titleEn: 'Contact', titleAr: 'تواصل معنا',
    metaEn: 'Get in touch with BrainSAIT.', metaAr: 'تواصل مع برينسايت.',
    en: [
      ['Email', 'hello@brainsait.de'],
      ['Store', 'store.brainsait.de'],
      ['Hours', 'We respond within 1 business day.'],
    ],
    ar: [
      ['البريد', 'hello@brainsait.de'],
      ['المتجر', 'store.brainsait.de'],
      ['أوقات العمل', 'نرد خلال يوم عمل واحد.'],
    ],
  },
};

export default function InfoPage({ page }: { page: keyof typeof PAGES }) {
  const { ar } = useI18n();
  const info = PAGES[page];
  usePageMeta({ title: (ar ? info.titleAr : info.titleEn) + ' — BrainSAIT', description: ar ? info.metaAr : info.metaEn, url: `/${page}`, type: 'website' });
  const rows = ar ? info.ar : info.en;
  return (
    <main className="page">
      <header className="page-head reveal"><h1>{ar ? info.titleAr : info.titleEn}</h1></header>
      <div className="program-benefits" style={{ maxWidth: 760, margin: '0 auto' }}>
        {rows.map(([k, v], i) => (
          <div key={i} className="benefit-card" style={{ padding: '1rem', borderRadius: 14, border: '1px solid var(--line, #e5e7eb)', background: 'var(--surface, transparent)', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: '0 0 0.35rem' }}>{k}</h3>
            <p style={{ margin: 0, opacity: 0.85 }}>{v}</p>
          </div>
        ))}
        <p className="fineprint" style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          {ar ? 'تواصل: hello@brainsait.de' : 'Contact: hello@brainsait.de'}
        </p>
      </div>
    </main>
  );
}
