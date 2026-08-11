export type Stage = 'learn' | 'build' | 'solutions';

export interface Product {
  slug: string;
  stage: Stage;
  name: string;
  nameAr: string;
  category?: string;
  categoryAr?: string;
  sub: string;
  tier?: string;
  tagline?: string;
  taglineAr?: string;
  description?: string;
  descriptionAr?: string;
  price?: number | null;
  billingEn?: string;
  billingAr?: string;
  free?: boolean;
  image?: string;
  badges?: string[];
  benefits?: string[];
  formats?: string[];
  whatsIncluded?: string[];
  faqs?: unknown[];
  rating?: number;
  users?: number;
  flag?: string;
  demoUrl?: string;
  /** Live Shopify product page — payment completes there via PayPal. */
  shopifyUrl?: string | null;
  shopifyHandle?: string | null;
  sku?: string | null;
  available?: boolean;
}

export interface Benefit {
  id: string;
  icon: string;
  titleEn: string;
  titleAr: string;
  discount: number;
  category: string;
  identityTypes?: string[];
  professions?: string[];
  academicTypes?: string[];
  descriptionEn: string;
  descriptionAr: string;
  requiresVerification: boolean;
}

export interface Exception {
  id: string; labelEn: string; labelAr: string;
  discountPct: number; note?: string;
}

export interface Track {
  id: string; labelEn: string; labelAr: string; icon?: string;
}

export interface Program {
  slug: string; stage: 'build'; kind: 'program';
  name: string; nameAr: string;
  price: number; currency: string;
  billingEn?: string; billingAr?: string;
  tagline?: string; taglineAr?: string;
  description?: string; descriptionAr?: string;
  exceptions?: Exception[];
  benefits?: Benefit[];
  tracks: Track[];
  badges?: string[];
  available?: boolean;
}
export interface StageDef {
  id: Stage; en: string; ar: string; route: string;
  blurbEn: string; blurbAr: string;
}
export interface SubDef { id: string; en: string; ar: string; }

export interface Catalog {
  stages: StageDef[];
  subcategories: SubDef[];
  learn: Product[];
  build: { program: Program; courses: Product[] };
  solutions: Product[];
  meta: { storeBase: string; currency: string; checkout: string };
}
