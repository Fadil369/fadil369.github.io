# Build Eligibility Engine — End-to-End Testing Workflows

**Status:** Ready for QA  
**Date:** 2026-08-11  
**Product:** BrainSAIT Incubation Program  
**Store:** https://store.brainsait.org  
**Form:** https://fadil369.github.io/build

## ✅ Completed Setup

### Shopify Product Configuration
- **Product:** BrainSAIT Incubation Program
- **Product ID:** gid://shopify/Product/8047612067923
- **Status:** ACTIVE

### Variant Setup (5 Tiers)
| Tier | SKU | Variant ID | Price | Status |
|------|-----|-----------|-------|--------|
| Saudi/Sudanese (Free) | BSP-BUILD-FREE | 45950044635219 | SAR 0 | ✅ Created |
| Healthcare Professional | BSP-BUILD-HC-50 | 45950044667987 | SAR 4,815 | ✅ Created |
| Warrior Entrepreneur | BSP-BUILD-WARRIOR-35 | 45950044700755 | SAR 6,259.50 | ✅ Created |
| Academic (Student/Researcher) | BSP-BUILD-ACADEMIC-30 | 45950044733523 | SAR 6,741 | ✅ Created |
| Standard | BSP-BUILD-STANDARD | 45950044766291 | SAR 9,630 | ✅ Created |

### Discount Codes
| Code | Amount Off | Type | Usage | Status |
|------|-----------|------|-------|--------|
| SAUDI_SUDANESE_BUILD_FREE | SAR 9,630 | Fixed | 1 per customer | ✅ Created |

### Form Integration
- ✅ All variant IDs updated in `BuildEligibilityForm.tsx`
- ✅ Cart properties configured for Shopify tracking
- ✅ SessionStorage for post-purchase data
- ✅ Shopify redirect URL properly constructed

---

## 🧪 Test Scenarios

### Test 1: Standard User (Full Price — SAR 9,630)

**User Profile:**
- Identity: International
- Profession: Other
- Category: Other

**Expected Behavior:**
1. Form navigates: Welcome → Identity → Profession → Result
2. Pricing shows:
   - Original: SAR 9,630
   - Discount: 0%
   - Final: SAR 9,630
3. "Go to payment" button appears

**Shopify Verification:**
1. Click "Go to payment"
2. Redirect to: `https://store.brainsait.org/cart/add?id=45950044766291&quantity=1&properties[eligibility_tier]=standard&properties[discount_percent]=0&properties[final_price]=9630`
3. Verify cart shows:
   - Product: BrainSAIT Incubation Program
   - Variant: Standard
   - Price: SAR 9,630

**Passing Criteria:**
- ✓ Form calculates correct tier
- ✓ Cart URL has correct variant ID
- ✓ Shopify cart displays correct price
- ✓ Order can be placed (PayPal sandbox)

---

### Test 2: Healthcare Professional (50% Off — SAR 4,815)

**User Profile:**
- Identity: International
- Profession: Doctor (or Nurse / Healthcare)

**Expected Behavior:**
1. Form navigates: Welcome → Identity → Profession → Result (skips verification for doctor)
2. Pricing shows:
   - Original: SAR 9,630
   - Discount: 50%
   - Savings: −SAR 4,815
   - Final: SAR 4,815
3. Tier label: "Healthcare Builder Benefit"

**Shopify Verification:**
1. Click "Go to payment"
2. Redirect to: `https://store.brainsait.org/cart/add?id=45950044667987&quantity=1&properties[eligibility_tier]=healthcare_50&properties[discount_percent]=50&properties[final_price]=4815`
3. Verify cart shows:
   - Variant: Healthcare Professional
   - Price: SAR 4,815
   - Cart properties include: `eligibility_tier=healthcare_50`

**Passing Criteria:**
- ✓ Correct pricing tier applied
- ✓ No verification step required
- ✓ Cart URL has correct variant ID
- ✓ Cart properties pass through

---

### Test 3: Saudi National (Free — SAR 0)

**User Profile:**
- Identity: Saudi
- No profession needed (highest priority)

**Expected Behavior:**
1. Form navigates: Welcome → Identity → Verification → Result
2. Requires: Upload Saudi National ID
3. Pricing shows:
   - Original: SAR 9,630
   - Discount: 100%
   - Savings: −SAR 9,630
   - Final: **FREE**
4. Button text: "Complete verification →" (not "Go to payment")

**Shopify Verification:**
1. Click verification button
2. Redirect to: `https://store.brainsait.org/cart/add?id=45950044635219&quantity=1&properties[eligibility_tier]=sa_sd_free&properties[discount_percent]=100&properties[final_price]=0`
3. Cart shows: SAR 0 price
4. Shopify should apply `SAUDI_SUDANESE_BUILD_FREE` discount automatically (OR customer enters code manually)
5. After discount, cart total = SAR 0
6. Proceed to "complete order" (PayPal may not process, manual verification needed)

**Passing Criteria:**
- ✓ Identity tier takes priority over any profession
- ✓ Verification step appears
- ✓ Final price shows FREE
- ✓ Cart URL correct for zero-price variant
- ✓ Discount code can be applied

---

### Test 4: Warrior Entrepreneur (35% Off — SAR 6,259.50)

**User Profile:**
- Identity: International
- Category: Entrepreneur
- Organization name: TechStartup Inc
- Website/LinkedIn: Provided
- Project description: Provided

**Expected Behavior:**
1. Form navigates: Welcome → Identity → Profession → Verification → Result
2. Verification step requires:
   - Company/Project name
   - Website or LinkedIn
   - What are you building? (description)
3. Pricing shows:
   - Original: SAR 9,630
   - Discount: 35%
   - Savings: −SAR 3,370.50
   - Final: SAR 6,259.50
4. Tier label: "Warrior Entrepreneur Benefit"

**Shopify Verification:**
1. Click "Go to payment"
2. Redirect to: `https://store.brainsait.org/cart/add?id=45950044700755&quantity=1&properties[eligibility_tier]=warrior_35&properties[discount_percent]=35&properties[final_price]=6259.50`
3. Cart shows:
   - Variant: Warrior Entrepreneur
   - Price: SAR 6,259.50
   - Cart properties: `eligibility_tier=warrior_35`

**Passing Criteria:**
- ✓ Verification step collected
- ✓ Correct pricing applied
- ✓ Cart shows entrepreneur variant
- ✓ Order can be placed

---

### Test 5: Academic Student (30% Off — SAR 6,741)

**User Profile:**
- Identity: International
- Category: Student
- University name: King Abdulaziz University (or any university)

**Expected Behavior:**
1. Form navigates: Welcome → Identity → Profession → Verification → Result
2. Verification step requires:
   - University name only
3. Pricing shows:
   - Original: SAR 9,630
   - Discount: 30%
   - Savings: −SAR 2,889
   - Final: SAR 6,741
4. Tier label: "Knowledge Builder Benefit"

**Shopify Verification:**
1. Click "Go to payment"
2. Redirect to: `https://store.brainsait.org/cart/add?id=45950044733523&quantity=1&properties[eligibility_tier]=academic_30&properties[discount_percent]=30&properties[final_price]=6741`
3. Cart shows:
   - Variant: Academic (Student/Researcher)
   - Price: SAR 6,741

**Passing Criteria:**
- ✓ Verification step collected
- ✓ Correct pricing applied
- ✓ Cart shows student variant
- ✓ Order can be placed

---

## 🔄 Priority Conflict Tests

### Test 6: Saudi Doctor (Priority = 100% Free, not 50% Healthcare)

**User Profile:**
- Identity: Saudi
- Profession: Doctor

**Expected Behavior:**
1. Form skips profession step after detecting Saudi identity
2. Goes directly to: Welcome → Identity → Verification → Result
3. Pricing shows: **FREE** (not 50% off)
4. Tier label: "Founding Identity Benefit" (not "Healthcare Builder Benefit")

**Passing Criteria:**
- ✓ Identity tier (100%) overrides profession tier (50%)
- ✓ No profession selection needed
- ✓ Final tier is `sa_sd_free`, not `healthcare_50`

---

## 📱 Mobile/Responsive Tests

**Devices to Test:**
- iPhone 12 (390px width)
- iPad (768px width)
- Desktop (1920px width)

**Checklist:**
- ✓ Form steps are readable at mobile width
- ✓ Option cards stack vertically on mobile
- ✓ Price display is clear on all sizes
- ✓ Buttons are touch-friendly (min 44px height)
- ✓ Dark mode CSS applies correctly

---

## 🌐 Bilingual Tests

**Test Both Language Modes:**

### English (EN) Path
1. Load https://fadil369.github.io/build (default is EN)
2. Verify all copy is in English
3. Test all 5 scenarios in English

### Arabic (AR) Path
1. Set language to Arabic in browser console: `localStorage.setItem('lang', 'ar')`
2. Reload page
3. Verify all copy is in Arabic
4. Verify RTL layout applies
5. Test one scenario in Arabic to verify calculations work

---

## ✔️ Pre-Launch Checklist

### Code & Build
- [ ] `npm run build` completes without errors
- [ ] Production bundle size is acceptable
- [ ] No console errors in dev tools

### Form Behavior
- [ ] All 5 test scenarios pass (Sections 1-5 above)
- [ ] Priority conflicts handled correctly (Section 6)
- [ ] Mobile responsive (Section 7)
- [ ] Both languages work (Section 8)

### Shopify Integration
- [ ] Product created with 5 variants ✅
- [ ] Variant IDs match form code ✅
- [ ] Cart URLs redirect correctly
- [ ] Cart properties pass through to Shopify
- [ ] Discount code `SAUDI_SUDANESE_BUILD_FREE` applies to SAR 0 tier

### PayPal (Sandbox)
- [ ] Shopify store has sandbox PayPal enabled
- [ ] Can proceed from cart to PayPal checkout
- [ ] PayPal test payment processes (sandbox account)
- [ ] Order appears in Shopify admin

### Post-Purchase
- [ ] Application data stored in sessionStorage
- [ ] Order includes tier metadata
- [ ] Ready for Airtable webhook integration (future)

---

## 🐛 Troubleshooting

### Form shows wrong price
- Verify variant IDs in `BuildEligibilityForm.tsx` match Shopify
- Check `pricingEngine.ts` logic for tier priority
- Clear browser cache and reload

### Cart URL malformed
- Verify variant ID format (numeric, not GID)
- Check URL encoding of cart properties
- Inspect network tab for redirect URL

### PayPal checkout fails
- Ensure Shopify sandbox PayPal is enabled
- Verify store currency is SAR
- Check PayPal account is business account (not personal)

### Discount code not applying
- Verify code exists: Shopify Admin → Discounts → `SAUDI_SUDANESE_BUILD_FREE`
- Check code is active (not expired or paused)
- Check code usage limit hasn't been exceeded
- Verify discount targets "entire order"

---

## 📊 Success Metrics

After launch, track:

1. **Conversion by Tier:**
   - % of users reaching each tier
   - Completion rate per tier
   - Drop-off points

2. **Payment Success:**
   - PayPal success rate overall
   - Error rate per tier
   - Average transaction time

3. **Application Data:**
   - Eligibility tier distribution
   - Geographic distribution (SA/SD vs International)
   - Profession breakdown

---

## 🚀 Next Steps (Post-QA)

1. **Airtable Integration** — Webhook for order creation
2. **Email Notifications** — Resend integration for confirmations
3. **Analytics Dashboard** — Track tier distribution and conversion
4. **Access Provisioning** — Automate course/credential issuance
5. **Manual Verification Queue** — For entrepreneur/student applications

---

**Last Updated:** 2026-08-11  
**Shopify Store:** store.brainsait.org  
**Form URL:** https://fadil369.github.io/build  
**GitHub:** https://github.com/Fadil369/fadil369.github.io
