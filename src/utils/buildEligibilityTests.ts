/**
 * Test scenarios for Build Eligibility Engine
 * Covers all user workflows and pricing tier calculations
 */

import { calculatePrice, type EligibilityData, type PricingResult } from './pricingEngine';

export interface TestScenario {
  name: string;
  description: string;
  input: EligibilityData;
  expectedTier: string;
  expectedDiscount: number;
  expectedPrice: number;
  expectedSavings: number;
}

export const testScenarios: TestScenario[] = [
  // Tier 1: Saudi/Sudanese Identity (100% FREE)
  {
    name: 'Saudi National - 100% Free',
    description: 'Saudi Arabian national with ID verification',
    input: {
      identity: 'SA',
      profession: undefined,
      category: undefined,
    },
    expectedTier: 'sa_sd_free',
    expectedDiscount: 100,
    expectedPrice: 0,
    expectedSavings: 9630,
  },
  {
    name: 'Sudanese National - 100% Free',
    description: 'Sudanese national with ID verification',
    input: {
      identity: 'SD',
      profession: undefined,
      category: undefined,
    },
    expectedTier: 'sa_sd_free',
    expectedDiscount: 100,
    expectedPrice: 0,
    expectedSavings: 9630,
  },
  {
    name: 'Saudi Doctor - Priority to Identity (100% Free)',
    description: 'Saudi who is also a doctor - identity benefit takes priority',
    input: {
      identity: 'SA',
      profession: 'doctor',
      category: undefined,
    },
    expectedTier: 'sa_sd_free',
    expectedDiscount: 100,
    expectedPrice: 0,
    expectedSavings: 9630,
  },
  {
    name: 'Sudanese Entrepreneur - Priority to Identity (100% Free)',
    description: 'Sudanese founder - identity benefit takes priority',
    input: {
      identity: 'SD',
      profession: undefined,
      category: 'entrepreneur',
    },
    expectedTier: 'sa_sd_free',
    expectedDiscount: 100,
    expectedPrice: 0,
    expectedSavings: 9630,
  },

  // Tier 2: Healthcare Professionals (50% off)
  {
    name: 'International Doctor - 50% Off',
    description: 'Non-Saudi/Sudanese physician',
    input: {
      identity: 'OTHER',
      profession: 'doctor',
      organizationName: 'King Faisal Specialist Hospital',
    },
    expectedTier: 'healthcare_50',
    expectedDiscount: 50,
    expectedPrice: 4815,
    expectedSavings: 4815,
  },
  {
    name: 'International Nurse - 50% Off',
    description: 'Non-Saudi/Sudanese nurse',
    input: {
      identity: 'OTHER',
      profession: 'nurse',
    },
    expectedTier: 'healthcare_50',
    expectedDiscount: 50,
    expectedPrice: 4815,
    expectedSavings: 4815,
  },
  {
    name: 'International Healthcare Professional - 50% Off',
    description: 'Non-Saudi/Sudanese other healthcare professional',
    input: {
      identity: 'OTHER',
      profession: 'healthcare',
    },
    expectedTier: 'healthcare_50',
    expectedDiscount: 50,
    expectedPrice: 4815,
    expectedSavings: 4815,
  },

  // Tier 3: Warrior Entrepreneurs (35% off)
  {
    name: 'International Entrepreneur - 35% Off',
    description: 'Founder building a startup',
    input: {
      identity: 'OTHER',
      profession: undefined,
      category: 'entrepreneur',
      organizationName: 'TechStartup Inc',
      website: 'https://techstartup.com',
      buildingDescription: 'AI-powered healthcare platform for Middle East',
    },
    expectedTier: 'warrior_35',
    expectedDiscount: 35,
    expectedPrice: 6259.5,
    expectedSavings: 3370.5,
  },
  {
    name: 'International Entrepreneur with LinkedIn - 35% Off',
    description: 'Founder with LinkedIn profile',
    input: {
      identity: 'OTHER',
      category: 'entrepreneur',
      linkedinUrl: 'https://linkedin.com/in/founder',
      buildingDescription: 'Building the next generation of digital tools',
    },
    expectedTier: 'warrior_35',
    expectedDiscount: 35,
    expectedPrice: 6259.5,
    expectedSavings: 3370.5,
  },

  // Tier 4: Students/Researchers (30% off)
  {
    name: 'University Student - 30% Off',
    description: 'Undergraduate or graduate student',
    input: {
      identity: 'OTHER',
      profession: undefined,
      category: 'student',
      universityName: 'King Abdulaziz University',
    },
    expectedTier: 'academic_30',
    expectedDiscount: 30,
    expectedPrice: 6741,
    expectedSavings: 2889,
  },
  {
    name: 'Research Scholar - 30% Off',
    description: 'Academic researcher or postdoc',
    input: {
      identity: 'OTHER',
      category: 'researcher',
      universityName: 'KAIST',
      buildingDescription: 'Research on AI ethics in healthcare',
    },
    expectedTier: 'academic_30',
    expectedDiscount: 30,
    expectedPrice: 6741,
    expectedSavings: 2889,
  },
  {
    name: 'International Student - 30% Off',
    description: 'Student from outside Saudi Arabia',
    input: {
      identity: 'OTHER',
      category: 'student',
      universityName: 'Harvard University',
    },
    expectedTier: 'academic_30',
    expectedDiscount: 30,
    expectedPrice: 6741,
    expectedSavings: 2889,
  },

  // Tier 5: Standard (No discount)
  {
    name: 'Standard User - Full Price',
    description: 'International user without specific eligibility',
    input: {
      identity: 'OTHER',
      profession: 'other',
      category: 'other',
    },
    expectedTier: 'standard',
    expectedDiscount: 0,
    expectedPrice: 9630,
    expectedSavings: 0,
  },
  {
    name: 'No Data Provided - Full Price',
    description: 'User skipped eligibility questions',
    input: {},
    expectedTier: 'standard',
    expectedDiscount: 0,
    expectedPrice: 9630,
    expectedSavings: 0,
  },

  // Priority conflict tests
  {
    name: 'Doctor + Entrepreneur - Healthcare Priority',
    description: 'User is both doctor and entrepreneur - higher benefit (doctor) should apply',
    input: {
      identity: 'OTHER',
      profession: 'doctor',
      category: 'entrepreneur',
    },
    expectedTier: 'healthcare_50',
    expectedDiscount: 50,
    expectedPrice: 4815,
    expectedSavings: 4815,
  },
  {
    name: 'Student + Entrepreneur - Entrepreneur Priority',
    description: 'User is student and entrepreneur - entrepreneur benefit applies',
    input: {
      identity: 'OTHER',
      category: 'entrepreneur',
      universityName: 'MIT',
    },
    expectedTier: 'warrior_35',
    expectedDiscount: 35,
    expectedPrice: 6259.5,
    expectedSavings: 3370.5,
  },
];

export function runAllTests(): { passed: number; failed: number; failures: string[] } {
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  testScenarios.forEach((scenario) => {
    const result = calculatePrice(scenario.input);

    const tierMatch = result.eligibilityId === scenario.expectedTier;
    const discountMatch = result.discount === scenario.expectedDiscount;
    const priceMatch = Math.abs(result.finalPrice - scenario.expectedPrice) < 0.01;
    const savingsMatch = Math.abs(result.savings - scenario.expectedSavings) < 0.01;

    if (tierMatch && discountMatch && priceMatch && savingsMatch) {
      passed++;
      console.log(`✅ ${scenario.name}`);
    } else {
      failed++;
      const failureMsg = [
        `❌ ${scenario.name}`,
        `   Expected: tier=${scenario.expectedTier}, discount=${scenario.expectedDiscount}%, price=SAR${scenario.expectedPrice}`,
        `   Got: tier=${result.eligibilityId}, discount=${result.discount}%, price=SAR${result.finalPrice}`,
        `   Mismatches: ${
          [
            !tierMatch && 'tier',
            !discountMatch && 'discount',
            !priceMatch && 'price',
            !savingsMatch && 'savings',
          ]
            .filter(Boolean)
            .join(', ')
        }`,
      ].join('\n');
      failures.push(failureMsg);
      console.error(failureMsg);
    }
  });

  return { passed, failed, failures };
}

export function getTestSummary(): string {
  const result = runAllTests();
  return `
╔════════════════════════════════════════════╗
║   BUILD ELIGIBILITY ENGINE TEST RESULTS   ║
╠════════════════════════════════════════════╣
║ Total Tests:  ${result.passed + result.failed}                                ║
║ ✅ Passed:    ${result.passed}                                  ║
║ ❌ Failed:    ${result.failed}                                  ║
╚════════════════════════════════════════════╝
${result.failed > 0 ? '\nFailure Details:\n' + result.failures.join('\n\n') : ''}
  `.trim();
}

// Export for use in browser console or test runners
if (typeof window !== 'undefined') {
  (window as any).buildEligibilityTests = {
    runAllTests,
    getTestSummary,
    testScenarios,
  };
}
