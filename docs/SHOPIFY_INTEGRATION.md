# BrainSAIT Build Program - Shopify Integration Guide

**Last updated:** 2026-08-14

This guide explains how the Shopify store (`store.brainsait.org`) handles the Build Program today.

## Current state: one flat ticket, no tiers

Tiers and eligibility pricing are **cancelled**. There is exactly **one standard Build Ticket** at a flat **9,630 SAR** (was 14,960 SAR) for every applicant. The eligibility form on the Build page was replaced with a slim intake (contact + GitHub username + promo code) — there is no identity/profession/verification flow anymore.

### Canonical Shopify product

| Field | Value |
|---|---|
| Product | BUILD Ticket — Incubation Pass |
| Handle | `build-ticket` |
| Product ID | `gid://shopify/Product/8046917353555` |
| Variant | Standard — `gid://shopify/ProductVariant/45947217870931` |
| SKU | `BSP-BUILD-TICKET-IDENTITY` |
| Price | 9,630 SAR (flat) |
| Status | ACTIVE |

The obsolete tiered product `brainsait-incubation-program` (product id `8047612067923`) is **archived** — do not re-activate it. Verify the canonical product any time with `node Store/verifyIntegration.mjs` or by querying the Admin API for the single ACTIVE variant.

### Storefront → checkout chain

1. Applicant fills the flat intake on `https://fadil369.github.io/build` (name, email, phone, country, GitHub username, promo code).
2. `build-apply.brainsait.org/apply` creates the application (Notion page when configured, KV fallback), registers the applicant as a Shopify customer, and returns a checkout URL:
   ```
   https://store.brainsait.org/cart/add?id=45947217870931&quantity=1&properties[eligibility_tier]=standard&properties[discount_percent]=<promo%>&properties[final_price]=9630&properties[application_ref]=<ref>&properties[applicant_email]=<email>
   ```
   With a promo code the URL goes through the Shopify `/discount/CODE` flow first.
3. `orders/paid` webhook → `build-apply.brainsait.org/webhook/shopify` (HMAC-verified with `SHOPIFY_WEBHOOK_SECRET`) → application marked **Paid + Approved**.

## Flow after payment (automated)

- **Notion onboarding** — the candidate's Notion page is updated to Paid/Approved, the onboarding plan is created (cohort & sprint plan, GitHub repo invite, onboarding call), and all 16 milestones are seeded. Progress is tracked per candidate.
- **Shopify customer account (Partner API)** — the customer record is promoted with `build-partner`, `paid`, `partner-profile` tags via the Admin API so they appear in the store's customer/partner directory. Customer accounts are managed through the Shopify Partner org using the Partner API (store-level custom app `brainsait-fulfillment` token in `SHOPIFY_ADMIN_TOKEN`).
- **GitHub repo** — when a GitHub username is on the application, a private-ish repo is generated from `Fadil369/brainsait-build-starter` and the candidate is invited as a repo-scoped collaborator (idempotent via KV). The repo URL is surfaced on the Track page.
- **Paid welcome email** — via Resend with the Second Brain gift, companion links, and the application ref.
- **Certificate** — issued automatically (once, idempotent) when all 16 milestones are Completed; served at `build-apply.brainsait.org/certificate/<ref>`.

## Telegram bot status

The Telegram bot (`@BrainSAITForgeBot`) is **no longer the registration/entry gate** — the flow now runs on GitHub. The Build page no longer shows Telegram login or bot commands. Backend `/bot/*` endpoints on `build-apply` may remain for legacy progress tracking, but the onboarding task is now `Invite to GitHub repository` (channel `GitHub`).

## Promo codes

| Code | Discount | Note |
|---|---|---|
| LAUNCH10 | 10% off 9,630 | Validated server-side on build-apply; applied via Shopify `/discount/CODE` flow |
| FOUNDER15 | 15% off 9,630 | Same |

## Shopify webhook

- Topic: `orders/paid` → `https://build-apply.brainsait.org/webhook/shopify` (JSON)
- HMAC verified against `SHOPIFY_WEBHOOK_SECRET` (wrangler secret on the build-apply worker). Fail-closed: without the secret the route returns 503 so Shopify retries.
- Orders without an `application_ref` property are acknowledged and ignored (regular store purchases).
- Deduplicated per order via KV (`webhook-processed:<orderId>`) to survive duplicate deliveries.

## Environment (build-apply worker secrets)

- `SHOPIFY_STORE_DOMAIN` — default `store.brainsait.org`
- `SHOPIFY_ADMIN_TOKEN` — `shpat_...` from the store-level custom app (Partner org)
- `SHOPIFY_WEBHOOK_SECRET` — signs/verifies webhook HMAC
- `GITHUB_TOKEN` — enables GitHub repo provisioning after payment (scope: `repo`)
- `NOTION_TOKEN`, `NOTION_BUILD_DB_ID`, `NOTION_TASKS_DB_ID`, `NOTION_MILESTONES_DB_ID` — Notion onboarding

## Testing checklist (flat flow)

- [x] Single ACTIVE variant `45947217870931` @ 9,630 SAR, SKU `BSP-BUILD-TICKET-IDENTITY`
- [x] Obsolete tiered product archived
- [x] Checkout URL carries `application_ref` + `applicant_email` properties
- [x] `orders/paid` webhook live and HMAC-protected
- [x] Notion onboarding + milestone seeding on payment
- [x] Shopify customer upsert with partner tags via Partner API
- [x] GitHub repo generation + collaborator invite when username present
- [ ] Airtable automation (optional, legacy)

**Form:** https://fadil369.github.io/build
**Track:** https://fadil369.github.io/track?ref=<applicationRef>
