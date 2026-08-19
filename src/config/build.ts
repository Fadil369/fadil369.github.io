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
