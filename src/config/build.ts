/// <reference types="vite/client" />

export const BUILD_APPLY_BASE = import.meta.env.VITE_BUILD_APPLY_BASE || 'https://build-apply.brainsait.org';
export const BUILD_APPLY_API = import.meta.env.VITE_BUILD_APPLY_API || `${BUILD_APPLY_BASE}/apply`;
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
export const FOUNDER_OS_URL = 'https://fadil369.notion.site/Founder-OS-3ba3479c6f628117966fd1be6c120ac2';
export const ULTIMATE_BRAIN_BUILD_URL = 'https://fadil369.notion.site/Ultimate-Brain-3bc3479c6f628177afd7fb7e9224c19c';
export const FORGE_BOT_URL = 'https://t.me/brainsait_forge_bot';
export const CALENDAR_URL = 'https://calendar.app.google/rAqiE6pNumtECdnd7';
export const CUSTOMER_CLAIM_URL = `${BUILD_APPLY_BASE}/customer/claim`;
export const CUSTOMER_ME_URL = `${BUILD_APPLY_BASE}/customer/me`;
export const CUSTOMER_OTP_REQUEST_URL = `${BUILD_APPLY_BASE}/customer/otp/request`;
export const CUSTOMER_OTP_VERIFY_URL = `${BUILD_APPLY_BASE}/customer/otp/verify`;
/** BUILD-CARE — free ticket for healthcare workers (no deployment, marketing, or 1:1). */

export interface BuildInstallmentPlan {
  key: string;
  name_ar: string;
  name_en: string;
  /** Total program price in SAR. */
  total: number;
  /** Number of installment payments. */
  count: number;
  /** Per-installment amount in SAR (last may differ to reconcile to total). */
  amount: number;
  cadence_ar: string;
  cadence_en: string;
  desc_ar: string;
  desc_en: string;
}

/** The four BUILD installment categories. The "Full" plan is paid once; the
 *  other three split the 9,630 SAR program price across 2 / 3 / 4 payments. */
export const BUILD_INSTALLMENT_PLANS: BuildInstallmentPlan[] = [
  {
    key: 'FULL',
    name_ar: 'كامل',
    name_en: 'Full',
    total: 9630,
    count: 1,
    amount: 9630,
    cadence_ar: 'دفعة واحدة',
    cadence_en: 'One-time',
    desc_ar: 'ادفع المبلغ كاملاً مرة واحدة وابدأ فورًا بكل الموارد.',
    desc_en: 'Pay the full amount once and unlock everything immediately.',
  },
  {
    key: 'FLEX',
    name_ar: 'مرن',
    name_en: 'Flex',
    total: 9630,
    count: 2,
    amount: 4815,
    cadence_ar: 'دفعتان',
    cadence_en: 'Two payments',
    desc_ar: 'نصف الآن ونصف لاحقًا — مرونة لإطلاق برنامجك.',
    desc_en: 'Half now, half later — flexibility to launch your program.',
  },
  {
    key: 'SPLIT',
    name_ar: 'مقسّم',
    name_en: 'Split',
    total: 9630,
    count: 3,
    amount: 3210,
    cadence_ar: 'ثلاث دفعات',
    cadence_en: 'Three payments',
    desc_ar: 'وزّع التكلفة على ثلاث دفعات شهرية مريحة.',
    desc_en: 'Spread the cost over three comfortable monthly payments.',
  },
  {
    key: 'QUARTER',
    name_ar: 'ربع سنوي',
    name_en: 'Quarterly',
    total: 9630,
    count: 4,
    amount: 2407.5,
    cadence_ar: 'أربع دفعات',
    cadence_en: 'Four payments',
    desc_ar: 'أربع دفعات ربع سنوية — الالتزام الأخف على المدى الطويل.',
    desc_en: 'Four quarterly payments — the lightest long-term commitment.',
  },
];
