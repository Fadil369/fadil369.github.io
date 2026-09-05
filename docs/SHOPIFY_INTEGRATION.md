# BrainSAIT Build Program - Shopify Integration Guide

**Last updated:** 2026-08-14

This guide explains how the Shopify store (`store.brainsait.de`) handles the Build Program today.

## Current state: one flat ticket, no tiers

Tiers and eligibility pricing are **cancelled**. There is exactly **one standard Build Ticket** at a flat **9,630 SAR** (was 14,960 SAR) for every applicant. The eligibility form on the Build page was replaced with a slim intake (contact + GitHub username) — there is no identity/profession/verification flow anymore.

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

1. Applicant fills the flat intake on `https://fadil369.github.io/build` (name, email, phone, country, GitHub username, optional promo code).
2. `build-apply.brainsait.org/apply` creates the application (Notion page when configured, KV fallback), registers the applicant as a Shopify customer, and returns a checkout URL:
   ```
   https://store.brainsait.de/cart/add?id=45947217870931&quantity=1&properties[eligibility_tier]=standard&properties[final_price]=9630&properties[application_ref]=<ref>&properties[applicant_email]=<email>
   ```
   With a promo code the URL goes through the Shopify `/discount/CODE` flow first (verified: LAUNCH10 → 8,667 SAR, FOUNDER15 → 8,185.50 SAR on the session cart).
3. `orders/paid` webhook → `build-apply.brainsait.org/webhook/shopify` (HMAC-verified with `SHOPIFY_WEBHOOK_SECRET`) → application marked **Paid + Approved**.

## Flow after payment (automated)

- **Notion onboarding** — the candidate's Notion page is updated to Paid/Approved, the onboarding plan is created (cohort & sprint plan, GitHub repo invite, onboarding call), and all 16 milestones are seeded. Progress is tracked per candidate.
- **Shopify customer account (Partner API)** — the customer record is promoted with `build-partner`, `paid`, `partner-profile` tags via the Admin API so they appear in the store's customer/partner directory. Customer accounts are managed through the Shopify Partner org using the Partner API (store-level custom app `brainsait-fulfillment` token in `SHOPIFY_ADMIN_TOKEN`).
- **GitHub repo** — when a GitHub username is on the application, a private-ish repo is generated from `Fadil369/brainsait-build-starter` and the candidate is invited as a repo-scoped collaborator (idempotent via KV). The repo URL is surfaced on the Track page.
- **Airtable mirror** — every applicant gets an always-current record in the **Build Candidates** table (base `appE7sxyyLHrCQBSe`, table `tblGLOozm8LcUeXCD`): created at apply time, flipped to Paid + Approved by the webhook. Gated on the `AIRTABLE_API_KEY` / `AIRTABLE_BASE_ID` / `AIRTABLE_CANDIDATES_TABLE` secrets.
- **Paid welcome email** — via Resend with the Second Brain gift, dashboard link, and the application ref.
- **Certificate** — issued automatically (once, idempotent) when all 16 milestones are Completed; served at `build-apply.brainsait.org/certificate/<ref>`.

## Automated mailing system

Transactional mail is sent via **Resend from the verified domain `brainsait.org`** (`BrainSAIT <orders@brainsait.org>`), confirmed delivered to normal inboxes. Email types:
- Apply confirmation (EN/AR) with checkout link
- Paid welcome (GitHub flow copy — repo + Notion + dashboard)
- Daily standup (cron `0 9 * * *`)
- Completion certificate email
- Store Ops daily report (`store-commerce-automation`, sent to `REPORT_EMAIL`)

**Known constraint:** sending *to* `fadil@brainsait.org` is rejected by Apple iCloud's forwarding policy (554 HM08). brainsait.org mail routes to an iCloud mailbox via Cloudflare Email Routing, and Apple rejects externally-sent messages forwarded into that mailbox. Use a real inbox (e.g. Gmail) for ops recipients.

**Domain notes:**
- `resend.brainsait.org` is **NOT verified** in Resend (only its click-tracking CNAME exists; the DKIM TXT `resend._domainkey.resend.brainsait.org` has not been added, and the available Resend keys are send-only so the DKIM value cannot be read via API). It is not used as a sender.
- Hetzner `mail.your-server.de` SMTP is available for `brainsait.de` but **no mailbox is created yet** (KonsoleH panel needed) — a viable fallback once a mailbox exists.

## Telegram bot status

The Telegram bot (`@BrainSAITForgeBot`) is **no longer the registration/entry gate** — the flow now runs on GitHub. The Build page no longer shows Telegram login or bot commands. Backend `/bot/*` endpoints on `build-apply` may remain for legacy progress tracking, but the onboarding task is now `Invite to GitHub repository` (channel `GitHub`).

## Promo codes

| Code | Discount | Note |
|---|---|---|
| LAUNCH10 | 10% off 9,630 | Active in store; applied via Shopify `/discount/CODE` flow |
| FOUNDER15 | 15% off 9,630 | Active in store; applied via Shopify `/discount/CODE` flow |

## Shopify webhook

- Topic: `orders/paid` → `https://build-apply.brainsait.org/webhook/shopify` (JSON)
- HMAC verified against `SHOPIFY_WEBHOOK_SECRET` (wrangler secret on the build-apply worker). Fail-closed: without the secret the route returns 503 so Shopify retries.
- Orders without an `application_ref` property are acknowledged and ignored (regular store purchases).
- Deduplicated per order via KV (`webhook-processed:<orderId>`) to survive duplicate deliveries.

## Super partner suite (BrainSAIT OS expanded Admin API scope)

Since the app's scopes were upgraded (`write_discounts`, `write_orders`,
`write_fulfillments`, `write_gift_cards`, `write_companies`, `read_all_orders`,
etc.), the paid BUILD webhook now provisions a full partner profile:

- **Fulfillment** — a fulfillment record is created on the paid order (BUILD
  onboarding kit), idempotent via KV.
- **Welcome gift card** — SAR 500 store credit issued to the partner, idempotent.
- **B2B Company** — a Shopify Company record is created for the partner with
  their application ref as external id.
- **Order annotation** — the paid order is tagged `build-partner` +
  `super-provisioned` with a note recording the provisioning.

`store-commerce-automation` additionally:
- **Revenue analytics** — the daily report now includes 7d/30d revenue, AOV,
  order count and top products (real order data).
- **BUILD draft-order recovery** — abandoned BUILD checkout carts (variant
  45947217870931) are converted into draft orders (idempotent, `task=draft`).

All of the above is best-effort and never blocks the paid-confirmation flow.

## Ecosystem integration (Super partner event → whole stack)

When a paid BUILD order is provisioned, `build-apply` fans a rich
`super.partner.provisioned` event through the whole ecosystem:

1. **Event bus** — posted to `hub.brainsait.de/api/event` (X-Hub-Key auth) →
   appended to the bus, SSE subscribers notified, and forwarded to the n8n
   orchestrator (`/webhook/forge/event`).
2. **Telegram + SMS** — the hub's `notifyAll` pings the care-team channel
   (Telegram chat 7095694988) and SMS (Twilio → KonsoleH → email fallback).
3. **Portal profile** — `portal.brainsait.de/api/integration/super-partner`
   promotes the partner's profile (partner role + subsystems + entitlements:
   fulfillment/gift card/company/GitHub/Notion/track).
4. **Notion + Second Brain** — the candidate's Notion page (which lives inside
   the Arabic BUILD Ultimate Brain hub) gets a `Super Partner` badge, the
   provisioning summary in Notes, and Last Activity bumped.
5. **AI knowledge base** — `hub.brainsait.org/mcp/v1/kb/embed` indexes the
   partner into D1 `knowledge_base` so kb_search / RAG / AI gateway can find them.
6. **Airtable** — the hub mirrors the partner into the Build Candidates table
   (base appE7sxyyLHrCQBSe / tblGLOozm8LcUeXCD).
7. **Shopify** — fulfillment record, welcome gift card, B2B company, order
   tags + note (the Super partner suite).

Every step is best-effort + idempotent; no single failure blocks the paid
confirmation or the rest of the pipeline.

## BUILD Ticket installment system

The BUILD Ticket (flat SAR 9,630) can be paid on a plan chosen at intake:

| Plan | Payments | Amounts |
|---|---|---|
| `full` | 1 | 9,630 once |
| `flex` | 2 | 4,815 + 4,815 (30 days apart) |
| `split` | 3 | 3,210 × 3 (monthly) |
| `quarter` | 4 | 2,408 + 2,408 + 2,408 + 2,406 (weekly-style, 30 days apart) |

**How it works**
1. Intake form sends `plan`. `build-apply` creates an installment schedule in KV
   (`installment:<appRef>`), and the checkout carries `properties[installment_no]`
   + `properties[installment_ref]` so each payment is tracked per-installment.
2. The `orders/paid` webhook detects `installment_ref` → marks that single
   installment paid. The application is **only fully Paid + Approved when all
   installments are settled** (partial payments never unlock full provisioning).
3. The first payment URL returns installments 2/3 pay links in the apply response.

**Strict tracking + follow-up (cron daily)**
- Reminder escalation: T-3d friendly → T-1d nudge → T+1d urgent → T+3d final →
  T+7d warning → **≥14d overdue → SUSPENDED**.
- Reminders go by **email (Resend) + SMS (Twilio/KonsoleH via hub)** with a
  per-installment pay link.
- On suspension: portal profile 403 `account_suspended` (no access), Notion
  `Suspended` badge, hub events, Airtable/KB flagged. A late payment resumes
  the account automatically.

**Endpoints**
- `GET  /installment/<ref>` — plan status (used by the Track page).
- `POST /installment/<ref>` `{action: suspend|resume, reason}` — manual control.
- `POST portal.brainsait.de/api/integration/partner-status` — suspend/resume the
  partner's portal profile (enforced in `_require_context`).

## Environment (build-apply worker secrets)

- `SHOPIFY_STORE_DOMAIN` — default `store.brainsait.de`
- `SHOPIFY_ADMIN_TOKEN` — `shpat_...` from the store-level custom app (Partner org)
- `SHOPIFY_WEBHOOK_SECRET` — signs/verifies webhook HMAC
- `GITHUB_TOKEN` — enables GitHub repo provisioning after payment (scope: `repo`)
- `NOTION_TOKEN`, `NOTION_BUILD_DB_ID`, `NOTION_TASKS_DB_ID`, `NOTION_MILESTONES_DB_ID` — Notion onboarding
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — transactional mail (default `orders@brainsait.org`, verified domain)
- `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_CANDIDATES_TABLE` — Airtable Build Candidates mirror

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
