export const BASE_PRICE = 9630; // SAR

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
  buildingDescription?: string;
}

export interface PricingResult {
  tier: PricingTier;
  eligibilityId: string;
  discount: number;
  originalPrice: number;
  finalPrice: number;
  savings: number;
}

const tiers: Record<string, PricingTier> = {
  sa_sd_free: {
    id: 'sa_sd_free',
    titleEn: 'Founding Identity Benefit',
    titleAr: 'استحقاق الهوية التأسيسية',
    discount: 100,
    price: 0,
    icon: '🇸🇦🇸🇩',
  },
  healthcare_50: {
    id: 'healthcare_50',
    titleEn: 'Healthcare Builder Benefit',
    titleAr: 'استحقاق بناة الرعاية الصحية',
    discount: 50,
    price: 4815,
    icon: '🩺',
  },
  warrior_35: {
    id: 'warrior_35',
    titleEn: 'Warrior Entrepreneur Benefit',
    titleAr: 'استحقاق رائد الأعمال المحارب',
    discount: 35,
    price: 6259.50,
    icon: '⚔️',
  },
  academic_30: {
    id: 'academic_30',
    titleEn: 'Knowledge Builder Benefit',
    titleAr: 'استحقاق بناة المعرفة',
    discount: 30,
    price: 6741,
    icon: '🎓',
  },
  standard: {
    id: 'standard',
    titleEn: 'Standard Build Ticket',
    titleAr: 'تذكرة البناء العادية',
    discount: 0,
    price: BASE_PRICE,
    icon: '📋',
  },
};

export function calculatePrice(data: EligibilityData): PricingResult {
  // Launch pricing is FLAT: every BUILD seat is SAR 9,630. Identity and
  // profession are still collected (stored with the application) for cohort
  // routing and CRM, but no longer change the price.
  const tier = tiers.standard;
  const discount = tier.discount;
  const finalPrice = tier.price;
  const savings = BASE_PRICE - finalPrice;

  return {
    tier,
    eligibilityId: tier.id,
    discount,
    originalPrice: BASE_PRICE,
    finalPrice,
    savings,
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
