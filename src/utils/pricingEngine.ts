export const BASE_PRICE = 9630; // SAR — launch offer (limited time)
export const ORIGINAL_PRICE = 14630; // SAR — standard price before launch offer
export const LAUNCH_SAVINGS = ORIGINAL_PRICE - BASE_PRICE; // 5,330 SAR

export interface PricingTier {
  id: string;
  titleEn: string;
  titleAr: string;
  discount: number;
  price: number;
  icon: string;
}

export interface PromoCode {
  code: string;
  // Discount applied as a percentage of the launch offer price.
  discountPercent: number;
  titleEn: string;
  titleAr: string;
  active: boolean;
}

// Launch promo codes — personal, tied to a buyer email, single use.
// Codes are validated server-side on build-apply; this list mirrors the
// active codes so the storefront can preview the discounted price instantly.
export const PROMO_CODES: Record<string, PromoCode> = {
  LAUNCH10: {
    code: 'LAUNCH10',
    discountPercent: 10,
    titleEn: 'Early Bird — 10% off launch price',
    titleAr: 'خصم الطيور المبكرة — 10%',
    active: true,
  },
  FOUNDER15: {
    code: 'FOUNDER15',
    discountPercent: 15,
    titleEn: 'Founder Circle — 15% off launch price',
    titleAr: 'دائرة المؤسسين — 15%',
    active: true,
  },
};

export interface EligibilityData {
  identity?: string; // SA, SD, OTHER
  profession?: string; // doctor, nurse, healthcare
  category?: string; // entrepreneur, student, researcher, other
  organizationName?: string;
  universityName?: string;
  website?: string;
  linkedinUrl?: string;
  buildingDescription?: string;
}

export interface PricingResult {
  tier: PricingTier;
  eligibilityId: string;
  discount: number;
  originalPrice: number;
  launchPrice: number;
  finalPrice: number;
  savings: number;
  launchOffer: boolean;
  promo?: PromoCode;
}

const tiers: Record<string, PricingTier> = {
  standard: {
    id: 'standard',
    titleEn: 'Standard Build Ticket',
    titleAr: 'تذكرة البناء العادية',
    discount: 0,
    price: BASE_PRICE,
    icon: '📋',
  },
};

export function lookupPromo(code?: string): PromoCode | undefined {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase();
  const promo = PROMO_CODES[normalized];
  return promo && promo.active ? promo : undefined;
}

export function calculatePrice(
  data: EligibilityData,
  promoCode?: string
): PricingResult {
  // Launch pricing is FLAT: every BUILD seat is SAR 9,630 (was SAR 14,630).
  // Identity and profession are still collected (stored with the application)
  // for cohort routing and CRM, but no longer change the base price.
  // A valid promo code adds a discount on top of the launch price.
  const tier = tiers.standard;
  const promo = lookupPromo(promoCode);
  const promoDiscount = promo ? promo.discountPercent : 0;
  const finalPrice = promo ? BASE_PRICE * (1 - promoDiscount / 100) : BASE_PRICE;
  const savings = ORIGINAL_PRICE - finalPrice;

  return {
    tier,
    eligibilityId: tier.id,
    discount: promoDiscount,
    originalPrice: ORIGINAL_PRICE,
    launchPrice: BASE_PRICE,
    finalPrice,
    savings,
    launchOffer: true,
    promo,
  };
}

export function getTierDescription(result: PricingResult): {
  titleEn: string;
  titleAr: string;
  icon: string;
} {
  return {
    titleEn: result.tier.titleEn,
    titleAr: result.tier.titleAr,
    icon: result.tier.icon,
  };
}

export function formatPrice(price: number, ar: boolean = false): string {
  const formatted = price.toLocaleString(ar ? 'ar-SA' : 'en-SA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${formatted} SAR`;
}
