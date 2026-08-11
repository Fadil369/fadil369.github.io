import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Lang = 'ar' | 'en';
interface Ctx { lang: Lang; ar: boolean; toggle: () => void; t: (k: string) => string; }

const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    'nav.learn': 'Learn', 'nav.build': 'Build', 'nav.solutions': 'Solutions',
    'nav.all': 'All titles', 'brand': 'BrainSAIT Store',
    'cta.buy': 'Buy now', 'cta.details': 'Details', 'cta.demo': 'View demo',
    'cta.apply': 'Apply now', 'cta.soon': 'Coming soon',
    'checkout.note': 'Secure checkout with PayPal on store.brainsait.org',
    'filter.all': 'All', 'sub.healthcare': 'Healthcare', 'sub.business': 'Business',
    'sub.development': 'Development', 'sub.novel': 'Novels',
    'program.price': 'Program fee', 'program.tracks': 'Who is it for',
    'program.exceptions': 'Reduced fee', 'program.pick': 'Pick a solution to build',
    'free': 'Free', 'demo': 'Demo', 'from': 'from',
    'theme.dark': 'Switch to dark mode', 'theme.light': 'Switch to light mode',
  },
  ar: {
    'nav.learn': 'تعلّم', 'nav.build': 'ابنِ', 'nav.solutions': 'حلول',
    'nav.all': 'كل العناوين', 'brand': 'متجر برينسايت',
    'cta.buy': 'اشترِ الآن', 'cta.details': 'التفاصيل', 'cta.demo': 'عرض تجريبي',
    'cta.apply': 'قدّم الآن', 'cta.soon': 'قريباً',
    'checkout.note': 'دفع آمن عبر PayPal على store.brainsait.org',
    'filter.all': 'الكل', 'sub.healthcare': 'الرعاية الصحية', 'sub.business': 'الأعمال',
    'sub.development': 'التطوير', 'sub.novel': 'روايات',
    'program.price': 'رسوم البرنامج', 'program.tracks': 'لمن هذا البرنامج',
    'program.exceptions': 'رسوم مخفّضة', 'program.pick': 'اختر حلاً لتبنيه',
    'free': 'مجاني', 'demo': 'تجريبي', 'from': 'من',
    'theme.dark': 'الوضع الداكن', 'theme.light': 'الوضع الفاتح',
  },
};

const C = createContext<Ctx>(null as unknown as Ctx);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try { return (localStorage.getItem('bs-lang') as Lang) || 'ar'; } catch { return 'ar'; }
  });
  useEffect(() => {
    try { localStorage.setItem('bs-lang', lang); } catch { /* ignore */ }
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  const value = useMemo<Ctx>(() => ({
    lang, ar: lang === 'ar',
    toggle: () => setLang(l => (l === 'ar' ? 'en' : 'ar')),
    t: (k) => STRINGS[lang][k] ?? k,
  }), [lang]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export const useI18n = () => useContext(C);

export function money(v: number | null | undefined, ar: boolean) {
  if (v == null) return ar ? 'عند الطلب' : 'On request';
  if (v === 0) return ar ? 'مجاني' : 'Free';
  const n = Number(v).toLocaleString('en-US', { maximumFractionDigits: v % 1 === 0 ? 0 : 2 });
  return ar ? `${n} ر.س` : `${n} SAR`;
}
