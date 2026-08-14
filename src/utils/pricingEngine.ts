export const BASE_PRICE = 9630; // SAR — launch offer (limited time)
export const ORIGINAL_PRICE = 14960; // SAR — standard price before launch offer
export const LAUNCH_SAVINGS = ORIGINAL_PRICE - BASE_PRICE; // 5,330 SAR

export interface PricingTier {
  id: string;
  titleEn: string;
  titleAr: string;
  discount: number;
  price: number;
  icon: string;
}

export interface EligibilityData {
  identity?: string; // SA, SD, OTHER
  profession?: string; // doctor, nurse, healthcare
  category?: string; // entrepreneur, student, researcher, other
  organizationName?: string;
  universityName?: string;
  website?: string;
  linkedinUrl?: string;
  githubUsername?: string;
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

export function calculatePrice(
  data: EligibilityData,
  _promoCode?: string
): PricingResult {
  // Launch pricing is FLAT: every BUILD seat is SAR 9,630 (was SAR 14,960).
  // Promo codes are removed — they never existed in the Shopify store and a
  // broken /discount/CODE redirect would drop the application_ref and break
  // the post-payment automation.
  const tier = tiers.standard;
  const finalPrice = BASE_PRICE;
  const savings = ORIGINAL_PRICE - finalPrice;

  return {
    tier,
    eligibilityId: tier.id,
    discount: 0,
    originalPrice: ORIGINAL_PRICE,
    launchPrice: BASE_PRICE,
    finalPrice,
    savings,
    launchOffer: true,
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
