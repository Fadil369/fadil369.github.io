export type BenefitKey =
  | 'learnAll' | 'learnOne' | 'notion' | 'secondBrain' | 'telegram' | 'lark' | 'calendar' | 'deployment' | 'providerRegistry';

export const BENEFITS: Record<BenefitKey, { en: string; ar: string; icon: string }> = {
  learnAll: { en: 'All 40 LEARN books (private online library link)', ar: 'كل كتب LEARN الـ40 (رابط مكتبة خاص)', icon: '📚' },
  learnOne: { en: 'Single book PDF (R2 instant download)', ar: 'كتاب واحد PDF (تحميل فوري R2)', icon: '📖' },
  notion: { en: 'Notion Forge — 16-day courses + labs', ar: 'Notion Forge — دورات 16 يوماً + مختبرات', icon: '🧠' },
  secondBrain: { en: '2nd Brain notebooks (persistent)', ar: 'دفاتر العقل الثاني (دائمة)', icon: '🗂️' },
  telegram: { en: 'Telegram forge bot — tracking & follow-up', ar: 'بوت تليجرام — متابعة وتتبع', icon: '✈️' },
  lark: { en: 'Lark super-partner org setup', ar: 'إعداد مؤسسة Lark شريك مميز', icon: '💬' },
  calendar: { en: 'Google Meet kickoff (calendar booking)', ar: 'اجتماع انطلاق Meet (حجز تقويم)', icon: '📅' },
  deployment: { en: 'Pre-built deployment to your infra', ar: 'نشر جاهز على بنيتك', icon: '🚀' },
  providerRegistry: { en: 'BPR provider identity: SPID + OID + QR', ar: 'هوية BPR: SPID + OID + QR', icon: '◎' },
};

export type Tier = {
  id: string;
  cat: 'learn' | 'build' | 'solution';
  en: string; ar: string;
  price: number; period: 'once' | 'mo';
  handle: string; // shopify handle (without -1)
  taglineEn: string; taglineAr: string;
  benefits: BenefitKey[];
  popular?: boolean;
  accent: string;
};

export const TIERS: Tier[] = [
  {
    id: 'learn-book', cat: 'learn', en: 'LEARN Book', ar: 'كتاب LEARN',
    price: 99, period: 'once', handle: 'learn-books', // collection
    taglineEn: 'One book, instant R2 download',
    taglineAr: 'كتاب واحد، تحميل فوري R2',
    benefits: ['learnOne'], accent: '#0ea5e9',
  },
  {
    id: 'learn-monthly', cat: 'learn', en: 'LEARN Monthly', ar: 'LEARN شهري',
    price: 182, period: 'mo', handle: 'learn-brainsait-digital-access',
    taglineEn: 'All 40 books, private link + monthly renewal',
    taglineAr: 'كل الكتب الـ40، رابط خاص + تجديد شهري',
    benefits: ['learnAll'], popular: false, accent: '#0ea5e9',
  },
  {
    id: 'build-monthly', cat: 'build', en: 'BUILD Monthly', ar: 'BUILD شهري',
    price: 499, period: 'mo', handle: 'build-forge-incubator-founders-program',
    taglineEn: 'Forge incubator — 30-day cycles',
    taglineAr: 'حاضنة Forge — دورات 30 يوماً',
    benefits: ['learnAll', 'notion', 'secondBrain', 'telegram'], popular: true, accent: '#f59e0b',
  },
  {
    id: 'build-ticket', cat: 'build', en: 'BUILD Ticket', ar: 'تذكرة BUILD',
    price: 9630, period: 'once', handle: 'build-ticket',
    taglineEn: 'One-time ticket, same forge access',
    taglineAr: 'تذكرة لمرة واحدة، نفس وصول Forge',
    benefits: ['learnAll', 'notion', 'secondBrain', 'telegram'], accent: '#f59e0b',
  },
  {
    id: 'solution-ready', cat: 'solution', en: 'SOLUTION Ready', ar: 'SOLUTION جاهز',
    price: 24000, period: 'once', handle: 'solutions-ready-hospital-os', // representative; collection is solutions-ready
    taglineEn: 'Pre-built, deployed to you',
    taglineAr: 'جاهز مسبقاً، يُنشر لك',
    benefits: ['learnAll', 'notion', 'secondBrain', 'telegram', 'lark', 'calendar', 'deployment'], accent: '#10b981',
  },
  {
    id: 'solution-monthly', cat: 'solution', en: 'SOLUTION Monthly', ar: 'SOLUTION شهري',
    price: 1999, period: 'mo', handle: 'solutions-brainsait-super-partner-program',
    taglineEn: 'Super-partner, monthly',
    taglineAr: 'شريك مميز، شهري',
    benefits: ['learnAll', 'notion', 'secondBrain', 'telegram', 'lark'], accent: '#10b981',
  },
  {
    id: 'bpr-membership', cat: 'solution', en: 'BPR Membership', ar: 'عضوية BPR',
    price: 3960, period: 'once', handle: 'provider-registry',
    taglineEn: 'Annual by default, 163 SAR junior monthly option',
    taglineAr: 'سنوي افتراضياً، وخيار شهري للمبتدئين 163 ر.س',
    benefits: ['providerRegistry', 'learnAll', 'notion', 'lark'], popular: true, accent: '#b8f14e',
  },
];

export const STORE = 'https://store.brainsait.de';
export const productUrl = (handle: string) => `${STORE}/products/${handle}`;
export const collectionUrl = (handle: string) => `${STORE}/collections/${handle}`;
