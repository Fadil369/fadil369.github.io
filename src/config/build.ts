/// <reference types="vite/client" />

export const BUILD_APPLY_BASE = import.meta.env.VITE_BUILD_APPLY_BASE || 'https://build-apply.brainsait.org';
export const BUILD_APPLY_API = import.meta.env.VITE_BUILD_APPLY_API || `${BUILD_APPLY_BASE}/apply`;
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
