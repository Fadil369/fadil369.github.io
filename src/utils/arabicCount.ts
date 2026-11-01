// Arabic counted nouns change form with the number: 1 and 2 have their own words, 3–10 take the
// plural, 11–99 (and 100, 101, 102…) go back to the singular. Mirrors the CLDR plural classes for "ar".
export interface ArabicForms { zero?: string; one: string; two: string; few: string; many: string }

export function arabicCount(n: number, f: ArabicForms): string {
  if (n === 0) return f.zero ?? `0 ${f.many}`;
  if (n === 1) return f.one;
  if (n === 2) return f.two;
  const r = n % 100;
  return `${n} ${r >= 3 && r <= 10 ? f.few : f.many}`;
}

export const TOOL_FORMS: ArabicForms = { zero: 'لا أدوات', one: 'أداة واحدة', two: 'أداتان', few: 'أدوات', many: 'أداة' };

export const countTools = (n: number, ar: boolean) => (ar ? arabicCount(n, TOOL_FORMS) : `${n} tool${n === 1 ? '' : 's'}`);
