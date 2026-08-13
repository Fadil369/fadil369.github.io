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
  // FLAT launch pricing (2026-08-13): every BUILD seat is SAR 9,630.
  // Identity/profession are still collected for cohort routing & CRM.
  {
    name: 'Saudi National - Flat Price',
    description: 'Saudi Arabian national with ID verification - flat pricing',
    input: { identity: 'SA', profession: undefined, category: undefined },
    expectedTier: 'standard',
    expectedDiscount: 0,
    expectedPrice: 9630,
    expectedSavings: 0,
  },
  {
    name: 'Sudanese National - Flat Price',
    description: 'Sudanese national with ID verification - flat pricing',
    input: { identity: 'SD', profession: undefined, category: undefined },
    expectedTier: 'standard',
    expectedDiscount: 0,
    expectedPrice: 9630,
    expectedSavings: 0,
  },
  {
    name: 'Saudi Doctor - Flat Price',
    description: 'Saudi who is also a doctor - flat pricing',
    input: { identity: 'SA', profession: 'doctor', category: undefined },
    expectedTier: 'standard',
    expectedDiscount: 0,
    expectedPrice: 9630,
    expectedSavings: 0,
  },
  {
    name: 'International Doctor - Flat Price',
    description: 'Non-Saudi/Sudanese physician - flat pricing',
    input: { identity: 'OTHER', profession: 'doctor', organizationName: 'King Faisal Specialist Hospital' },
    expectedTier: 'standard',
    expectedDiscount: 0,
    expectedPrice: 9630,
    expectedSavings: 0,
  },
  {
    name: 'International Nurse - Flat Price',
    description: 'Non-Saudi/Sudanese nurse - flat pricing',
    input: { identity: 'OTHER', profession: 'nurse' },
    expectedTier: 'standard',
    expectedDiscount: 0,
    expectedPrice: 9630,
    expectedSavings: 0,
  },
  {
    name: 'International Entrepreneur - Flat Price',
    description: 'Founder building a startup - flat pricing',
    input: {
      identity: 'OTHER',
      profession: undefined,
      category: 'entrepreneur',
      organizationName: 'TechStartup Inc',
      website: 'https://techstartup.com',
      buildingDescription: 'AI-powered healthcare platform for Middle East',
    },
    expectedTier: 'standard',
    expectedDiscount: 0,
    expectedPrice: 9630,
    expectedSavings: 0,
  },
  {
    name: 'University Student - Flat Price',
    description: 'Undergraduate or graduate student - flat pricing',
    input: { identity: 'OTHER', profession: undefined, category: 'student', universityName: 'King Abdulaziz University' },
    expectedTier: 'standard',
    expectedDiscount: 0,
    expectedPrice: 9630,
    expectedSavings: 0,
  },
  {
    name: 'Research Scholar - Flat Price',
    description: 'Academic researcher or postdoc - flat pricing',
    input: { identity: 'OTHER', category: 'researcher', universityName: 'KAIST' },
    expectedTier: 'standard',
    expectedDiscount: 0,
    expectedPrice: 9630,
    expectedSavings: 0,
  },
  {
    name: 'Standard User - Flat Price',
    description: 'International user without specific eligibility',
    input: { identity: 'OTHER', profession: 'other', category: 'other' },
    expectedTier: 'standard',
    expectedDiscount: 0,
    expectedPrice: 9630,
    expectedSavings: 0,
  },
  {
    name: 'No Data Provided - Flat Price',
    description: 'User skipped eligibility questions',
    input: {},
    expectedTier: 'standard',
    expectedDiscount: 0,
    expectedPrice: 9630,
    expectedSavings: 0,
  },
  {
    name: 'Doctor + Entrepreneur - Flat Price',
    description: 'User is both doctor and entrepreneur - flat pricing',
    input: { identity: 'OTHER', profession: 'doctor', category: 'entrepreneur' },
    expectedTier: 'standard',
    expectedDiscount: 0,
    expectedPrice: 9630,
    expectedSavings: 0,
  },
  {
    name: 'Student + Entrepreneur - Flat Price',
    description: 'User is student and entrepreneur - flat pricing',
    input: { identity: 'OTHER', category: 'entrepreneur', universityName: 'MIT' },
    expectedTier: 'standard',
    expectedDiscount: 0,
    expectedPrice: 9630,
    expectedSavings: 0,
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
