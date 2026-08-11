# BrainSAIT Build Program - Shopify Integration Guide

This guide explains how to set up the Shopify store (`store.brainsait.org`) to properly handle the Build Eligibility Engine pricing tiers and integrate with PayPal.

## Overview

The Build Eligibility Engine calculates eligibility-based prices (SAR 0 to SAR 9,630) and passes the applicant's tier information to Shopify via cart line item properties. Shopify must be configured to:

1. Accept the pricing data from the form
2. Route to the correct payment gateway (PayPal)
3. Track eligibility tier for post-purchase CRM integration
4. Handle zero-price orders (free tier) appropriately

## Shopify Product Setup

### Step 1: Create Product Variants

The form currently routes to this base product:
```
https://store.brainsait.org/products/brainsait-incubation-program
```

Create 5 variants in Shopify with these exact SKUs (mapped in the form):

| Variant Name | SKU | Base Price | Actual Price | Purpose |
|---|---|---|---|---|
| Saudi/Sudanese (Free) | BSP-BUILD-FREE | SAR 9,630 | SAR 0 | Founding identity benefit |
| Healthcare Professional | BSP-BUILD-HC-50 | SAR 9,630 | SAR 4,815 | Doctor/Nurse 50% off |
| Warrior Entrepreneur | BSP-BUILD-WARRIOR-35 | SAR 9,630 | SAR 6,259.50 | Entrepreneur 35% off |
| Academic (Student/Researcher) | BSP-BUILD-ACADEMIC-30 | SAR 9,630 | SAR 6,741 | Student/Researcher 30% off |
| Standard | BSP-BUILD-STANDARD | SAR 9,630 | SAR 9,630 | Full price, no discount |

**Note:** To handle free orders, use a Shopify discount code or app that allows 100% discounts for verified Saudi/Sudanese applicants.

### Step 2: Update Variant IDs in Form

In `src/components/BuildEligibilityForm.tsx`, update the `variantMap` with actual Shopify variant IDs:

```typescript
const variantMap: Record<string, string> = {
  sa_sd_free: 'REPLACE_WITH_ACTUAL_VARIANT_ID',
  healthcare_50: 'REPLACE_WITH_ACTUAL_VARIANT_ID',
  warrior_35: 'REPLACE_WITH_ACTUAL_VARIANT_ID',
  academic_30: 'REPLACE_WITH_ACTUAL_VARIANT_ID',
  standard: 'REPLACE_WITH_ACTUAL_VARIANT_ID',
};
```

Get variant IDs from Shopify Admin:
1. Go to Products → Brainsait Incubation Program
2. Click each variant
3. Copy the ID from the URL (e.g., `https://admin.shopify.com/store/brainsait/products/7891234/variants/39817261`)

### Step 3: Configure Product Metafields

Add these metafields to the product for tracking:

| Field Name | Namespace | Key | Type | Description |
|---|---|---|---|---|
| Eligibility Tier | `brainsait` | `eligibility_tier` | single_line_text | Current tier |
| Base Price SAR | `brainsait` | `base_price` | number | Canonical SAR 9,630 |
| Discount Percent | `brainsait` | `discount_percent` | number | Discount % applied |

## PayPal Integration on Shopify

### Step 1: Enable PayPal Payment Method

1. **Admin Dashboard:**
   - Settings → Payments
   - Under "Payment providers," click "Add payment method"
   - Select "PayPal" from the list
   - Click "Complete setup"

2. **PayPal Account Requirements:**
   - Business account (not Personal)
   - Must be verified in Saudi Arabia or region serving MENA
   - Currency support for SAR (Saudi Riyal)

3. **Connect Your PayPal Account:**
   - Log in with your PayPal business email
   - Authorize Shopify to take payments on your behalf
   - Confirm the connected account appears in Shopify settings

### Step 2: Configure PayPal Settings

1. **Transaction Currency:**
   - Go to Settings → Payments → PayPal
   - Ensure store currency is set to SAR (Saudi Riyal)
   - PayPal will automatically handle currency conversion if needed

2. **Payment Flow:**
   - Recommended: "Website Payments Standard" for simplicity
   - Or: "Checkout with PayPal" for faster checkouts
   - Test mode available for sandbox testing

### Step 3: Test PayPal Payments

**Sandbox Testing (Before Production):**

1. Get PayPal Sandbox credentials:
   - Visit https://developer.paypal.com
   - Sign in → Sandbox accounts
   - Create test buyer and seller accounts

2. Enable Sandbox in Shopify:
   - Settings → Payments → PayPal
   - Toggle "Test mode" ON
   - Enter sandbox API credentials

3. Test each tier:
   - Place test orders for each eligibility tier
   - Verify correct prices in PayPal checkout
   - Confirm orders appear in Shopify admin

**Production Deployment:**

1. Disable test mode in Shopify PayPal settings
2. Verify live account credentials
3. Process first real payment carefully
4. Monitor transactions in PayPal dashboard

## Cart Properties for Eligibility Tracking

The form passes these properties to Shopify:

```
/cart/add?id=VARIANT_ID&quantity=1&properties[eligibility_tier]=healthcare_50&properties[discount_percent]=50&properties[final_price]=4815
```

### Shopify Will Receive:
- `properties[eligibility_tier]` - Tier ID (e.g., "healthcare_50")
- `properties[discount_percent]` - Discount % (0-100)
- `properties[final_price]` - Final SAR amount

### Store These for Post-Purchase:
Add a custom order attribute to capture these:

**Liquid Template (checkout.liquid or custom app):**
```liquid
{% if cart.line_items.first.properties.eligibility_tier %}
  <input type="hidden" name="attributes[Eligibility Tier]" value="{{ cart.line_items.first.properties.eligibility_tier }}" />
  <input type="hidden" name="attributes[Applied Discount]" value="{{ cart.line_items.first.properties.discount_percent }}%" />
{% endif %}
```

This ensures order notes include tier information for Airtable export.

## Handling Free Orders (SAR 0)

**Challenge:** PayPal doesn't process zero-value transactions.

**Solution Options:**

### Option A: Discount Code Automation
1. Create a Shopify discount code: `SAUDI_SUDANESE_BUILD_FREE`
2. Set discount to: "Fixed amount off entire order" → SAR 9,630
3. Limit to 1 use per customer (by email)
4. Automatically apply code for SA/SD tier via Discount API

**Implementation:**
```javascript
// After user selects Saudi/Sudanese tier:
const discountCode = 'SAUDI_SUDANESE_BUILD_FREE';
const cartUrl = `https://store.brainsait.org/discount/${discountCode}?redirect=/cart`;
```

### Option B: Shopify Plus Flow (Custom)
Use Shopify Flow or a custom app to:
1. Detect zero-price orders from SA/SD applications
2. Auto-confirm without payment processing
3. Create order in system
4. Send confirmation email with access credentials

### Option C: Zero-Price Item → Admin Fulfillment
1. Keep SAR 9,630 in Shopify
2. Apply 100% discount via custom app
3. Require manual verification in Shopify admin
4. Admin approves → order fulfills → access granted

**Recommended:** Use Option A (Discount Code) for simplicity.

## Order Confirmation & CRM Integration

### Step 1: Capture Order Data

When order is placed, Shopify should include:
- Order ID
- Customer email
- Eligibility tier (from cart properties)
- Applied discount %
- Final price paid (or SAR 0 for free tier)

### Step 2: Webhook to Airtable

Set up a Shopify webhook:
- Event: `orders/create`
- Destination: `https://hook.integromat.com/...` (or your Airtable automation)

**Webhook Payload Should Include:**
```json
{
  "order_id": "...",
  "customer_email": "...",
  "total": 4815,
  "tier": "healthcare_50",
  "discount_percent": 50,
  "original_price": 9630,
  "cart_properties": {
    "eligibility_tier": "healthcare_50",
    "discount_percent": "50",
    "final_price": "4815"
  }
}
```

### Step 3: Create Airtable Record

Airtable automation receives webhook → creates record in `BUILD_APPLICATIONS` table:
- Application ID (auto-generated)
- Email
- Tier
- Price
- Payment Status: "Paid" (or "Verified" for free tier)
- Created At: timestamp

## Testing Checklist

- [ ] All 5 product variants created in Shopify
- [ ] Variant IDs updated in form code
- [ ] PayPal account connected to Shopify
- [ ] Store currency set to SAR
- [ ] Test mode enabled in PayPal
- [ ] Free tier discount code created
- [ ] Order webhooks configured
- [ ] Airtable automation set up

## Test Workflow

### Test 1: Standard User (Full Price - SAR 9,630)
1. Go to https://fadil369.github.io/build
2. Identity: International
3. Profession: Other
4. Proceed to payment
5. Verify Shopify cart shows SAR 9,630
6. Complete with test PayPal (sandbox)
7. Verify order in Shopify admin

### Test 2: Healthcare Professional (50% Off - SAR 4,815)
1. Go to https://fadil369.github.io/build
2. Identity: International
3. Profession: Doctor
4. Verify: Upload test PDF
5. Proceed to payment
6. Verify Shopify cart shows SAR 4,815
7. Verify cart properties include `eligibility_tier=healthcare_50`
8. Complete with test PayPal
9. Check order notes for tier information

### Test 3: Saudi National (Free - SAR 0)
1. Go to https://fadil369.github.io/build
2. Identity: Saudi
3. Verification: Upload test ID
4. Proceed to payment
5. Verify page shows SAR 0 / FREE
6. Check that discount code is applied
7. Verify order in Shopify shows zero amount
8. Confirm free order processing works

### Test 4: Warrior Entrepreneur (35% Off - SAR 6,259.50)
1. Go to https://fadil369.github.io/build
2. Identity: International
3. Profession: Other → Entrepreneur
4. Verification: Enter project details
5. Proceed to payment
6. Verify Shopify cart shows SAR 6,259.50
7. Complete payment
8. Check order includes eligibility data

### Test 5: Academic Student (30% Off - SAR 6,741)
1. Go to https://fadil369.github.io/build
2. Identity: International
3. Profession: Other → Student
4. Verification: Enter university name
5. Proceed to payment
6. Verify Shopify cart shows SAR 6,741
7. Complete payment
8. Verify order tracking

## Troubleshooting

### "Cart shows wrong price"
- Check variant IDs in form code match Shopify
- Verify cart properties are being passed
- Check Shopify product variant prices are correct

### "PayPal checkout blank/error"
- Enable test mode in Shopify PayPal settings
- Verify PayPal sandbox credentials
- Check browser console for errors

### "Free tier not processing"
- Verify discount code is created and active
- Check discount limit settings
- Test with manual Shopify admin order

### "Order webhook not firing"
- Check webhook endpoint URL in Shopify admin
- Verify endpoint is publicly accessible
- Test webhook manually in Shopify admin

## Performance Monitoring

Track these metrics post-launch:

1. **Conversion by Tier:**
   - % of users reaching each tier
   - Completion rate per tier
   - Drop-off points

2. **Payment Success:**
   - PayPal success rate
   - Error rate by tier
   - Average transaction time

3. **Application Data:**
   - Eligibility tier distribution
   - Geographic distribution (SA/SD vs International)
   - Profession breakdown

Use Shopify analytics + Airtable queries to measure.

## Support

For issues with this integration:
1. Check Shopify admin → Orders → Details for tier info
2. Check PayPal transaction log
3. Verify Airtable webhook logs
4. Review browser console for client-side errors

---

**Last Updated:** 2026-08-11
**Shopify Store:** store.brainsait.org
**Form:** https://fadil369.github.io/build
