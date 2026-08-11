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
  // Priority #1 — Saudi or Sudanese (100% discount = FREE)
  if (data.identity === 'SA' || data.identity === 'SD') {
    return {
      tier: tiers.sa_sd_free,
      eligibilityId: 'sa_sd_free',
      discount: 100,
      originalPrice: BASE_PRICE,
      finalPrice: 0,
      savings: BASE_PRICE,
    };
  }

  // Priority #2 — Doctor/Nurse (50% discount)
  if (['doctor', 'nurse', 'healthcare'].includes(data.profession || '')) {
    return {
      tier: tiers.healthcare_50,
      eligibilityId: 'healthcare_50',
      discount: 50,
      originalPrice: BASE_PRICE,
      finalPrice: 4815,
      savings: BASE_PRICE * 0.5,
    };
  }

  // Priority #3 — Warrior Entrepreneur (35% discount)
  if (data.category === 'entrepreneur') {
    return {
      tier: tiers.warrior_35,
      eligibilityId: 'warrior_35',
      discount: 35,
      originalPrice: BASE_PRICE,
      finalPrice: 6259.5,
      savings: BASE_PRICE * 0.35,
    };
  }

  // Priority #4 — Student/Researcher (30% discount)
  if (['student', 'researcher'].includes(data.category || '')) {
    return {
      tier: tiers.academic_30,
      eligibilityId: 'academic_30',
      discount: 30,
      originalPrice: BASE_PRICE,
      finalPrice: 6741,
      savings: BASE_PRICE * 0.3,
    };
  }

  // Default — Standard pricing (0% discount)
  return {
    tier: tiers.standard,
    eligibilityId: 'standard',
    discount: 0,
    originalPrice: BASE_PRICE,
    finalPrice: BASE_PRICE,
    savings: 0,
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
