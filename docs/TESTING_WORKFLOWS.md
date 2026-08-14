# Build Program — End-to-End Testing Workflows

**Status:** Ready for QA (flat single-ticket flow)
**Date:** 2026-08-14
**Product:** BUILD Ticket — Incubation Pass
**Store:** https://store.brainsait.org
**Form:** https://fadil369.github.io/build

## ✅ Current Setup (single flat ticket)

Tiers are cancelled. There is one product, one variant, one price.

### Shopify Product Configuration
- **Product:** BUILD Ticket — Incubation Pass
- **Handle:** `build-ticket`
- **Product ID:** `gid://shopify/Product/8046917353555`
- **Variant:** Standard — `gid://shopify/ProductVariant/45947217870931`
- **SKU:** `BSP-BUILD-TICKET-IDENTITY`
- **Price:** SAR 9,630 (flat — was 14,960)
- **Status:** ACTIVE

### Obsolete
- `brainsait-incubation-program` (product id `8047612067923`) — **archived**, was the tiered product.
- Tier variants (free / 50% / 35% / 30%) — **deleted**.
- Discount code `SAUDI_SUDANESE_BUILD_FREE` — no longer used (no free tier).

## 🧪 Test Scenarios

### Test 1: Standard flat purchase (the only path)

1. Open https://fadil369.github.io/build
2. The intake shows the flat ticket card: Original 14,960 SAR → Launch 9,630 SAR.
3. Enter full name, email, country, and a GitHub username.
4. Submit → redirected to the Shopify cart with the single standard variant:
   `https://store.brainsait.org/cart/add?id=45947217870931&quantity=1&properties[eligibility_tier]=standard&properties[final_price]=9630&properties[application_ref]=<ref>&properties[applicant_email]=<email>`
5. Cart shows **BUILD Ticket — Incubation Pass / Standard — SAR 9,630**.
6. Complete checkout (sandbox payment first).
7. Order appears in Shopify admin with the `application_ref` property.

### Test 2: Post-payment automation (after `orders/paid` fires)

1. Notion candidate page flips to `Payment Status: Paid`, `Application Status: Approved`.
2. Onboarding plan created: `Create cohort & sprint plan`, `Invite to GitHub repository`, `Schedule onboarding call`.
3. All 16 milestones seeded in the Build Milestones database.
4. Shopify customer record upserted with `build-partner`, `paid`, `partner-profile` tags (Partner API).
5. GitHub repo generated from `Fadil369/brainsait-build-starter` and applicant invited (when GitHub username present) — repo URL appears on the Track page.
6. **Airtable mirror** — Build Candidates record flipped to Paid + Approved (base `appE7sxyyLHrCQBSe`, table `tblGLOozm8LcUeXCD`).
7. Paid welcome email sent via Resend (verified `orders@brainsait.org` → real inbox).

### Test 3: Certificate

1. Mark all milestones `Completed` in Notion (or complete all tasks via the Track/cron).
2. `GET https://build-apply.brainsait.org/certificate/<ref>` returns the premium certificate; issuance happens once (idempotent) and the certificate email goes out.

## 🔄 Flow that changed (2026-08-14)

- **Telegram registration removed** — the bot is no longer the entry gate; registration now runs via GitHub (username collected in the intake, repo provisioned after payment).
- **Eligibility form removed** — identity/profession/verification steps and tier pricing are gone; only the flat ticket remains.
- **5-day journey copy removed** from the Build page — the 14-day sprint copy is the only program timeline shown.

## 🌐 Bilingual Tests

- EN: load https://fadil369.github.io/build (default) — verify all copy in English.
- AR: `localStorage.setItem('lang', 'ar')`, reload — verify RTL + Arabic copy.

## ✔️ Pre-Launch Checklist

- [x] Single ACTIVE product with one Standard variant @ 9,630 SAR
- [x] Obsolete tiered product archived
- [x] Cart URL uses the canonical variant ID `45947217870931`
- [x] `application_ref` + `applicant_email` properties attached at checkout
- [x] `orders/paid` webhook → build-apply (HMAC protected, dedup via KV)
- [x] Notion onboarding + milestone seeding after payment
- [x] Shopify customer upsert (Partner API) with partner tags
- [x] GitHub repo provisioning after payment (needs `GITHUB_TOKEN` + username)
- [x] Airtable Build Candidates mirror (apply create + webhook paid update)
- [x] Resend mailing verified (`orders@brainsait.org` → Gmail delivered)
- [ ] Sandbox payment test performed end-to-end

## 🐛 Troubleshooting

- **Cart shows wrong price:** verify the canonical variant ID `45947217870931` is the one in the checkout URL (check `SHOPIFY_VARIANTS.standard` in the build-apply worker).
- **Webhook not firing:** check `SHOPIFY_WEBHOOK_SECRET` is set (without it the route returns 503), then check Shopify admin → Notifications.
- **No Notion row:** check `NOTION_TOKEN` / `NOTION_BUILD_DB_ID` secrets; KV fallback still stores the application.
- **No GitHub repo:** confirm the applicant's GitHub username was collected and `GITHUB_TOKEN` is set; repo generation is idempotent per application ref.

**Last Updated:** 2026-08-14
**Form URL:** https://fadil369.github.io/build
**GitHub:** https://github.com/Fadil369/fadil369.github.io
