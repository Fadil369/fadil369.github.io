# BrainSAIT commerce and fulfilment contract

The GitHub Pages storefront is the discovery layer. Shopify is the only payment
system of record. Post-payment access is granted only after a verified Shopify
`orders/paid` or subscription-renewal webhook; browser redirects never grant
entitlements.

## Canonical plans

| Plan | Shopify handle | Price | Entitlements |
| --- | --- | ---: | --- |
| LEARN PDF | Individual product handle | 99 SAR once | Purchased PDF via instant secure download |
| LEARN Monthly | `learn-brainsait-digital-access` | 182 SAR/month | One Frame.io library link for all 40 titles |
| BUILD Monthly | `build-forge-incubator-founders-program` | 499 SAR/month | LEARN + Notion Forge + Second Brain + Telegram bot + labs and feedback |
| BUILD Ticket | `build-ticket` | 9,630 SAR once | Complete BUILD founder journey and certification |
| SOLUTION Monthly | `solutions-brainsait-super-partner-program` | 1,999 SAR/month | LEARN + BUILD + Lark super-partner profile + one-to-one founder journey |
| SOLUTION Ready | Product-specific ready handle | 24,000 SAR once | Kickoff calendar/Meet + infrastructure intake + packaged deployment |

## Verified event sequence

1. Shopify verifies payment and signs the webhook payload.
2. The orchestrator deduplicates the event using the Shopify order ID.
3. Airtable records the customer, order, plan, payment status, renewal date,
   fulfilment status, and audit timestamps.
4. Hermes/email sends the purchase acknowledgement.
5. The plan-specific welcome email is sent:
   - LEARN PDF: secure single-file download.
   - LEARN Monthly: the complete Frame.io library link.
   - BUILD: LEARN link, Notion Forge, Second Brain, Telegram onboarding, and
     progress dashboard.
   - SOLUTION Monthly: BUILD resources plus Lark super-partner onboarding and
     founder-journey kickoff.
   - SOLUTION Ready: Google Calendar/Meet booking plus the infrastructure and
     source-code intake form.
6. GitHub creates or grants the appropriate private repository only for BUILD
   and SOLUTION entitlements.
7. Notion and Airtable track milestones, proof links, feedback, graduation,
   certificates, and badges.
8. Renewal events extend access. Failed, cancelled, or expired subscriptions
   start reminders and suspend only subscription-bound access after the grace
   period; purchased PDFs remain available.

## Integration responsibilities

- **Shopify:** payments, subscriptions, customer account, order and line-item identity.
- **Airtable:** fulfilment ledger and operational status.
- **Notion:** Forge curriculum, founder workspace, milestones, and feedback.
- **GitHub:** private project repository and source delivery.
- **Telegram:** `Brainsait_forge_bot` reminders, check-ins, and progress capture.
- **Lark:** SOLUTION Monthly partner profile and collaboration space.
- **Google Calendar/Meet + Form:** SOLUTION Ready discovery, infrastructure,
  domain, and source-code intake.
- **Frame.io:** single-link online access to the complete LEARN collection.
- **Hermes/email:** acknowledgement, welcome, reminder, failure, cancellation,
  and graduation messages.
- **Canva:** certificate and badge templates; it is not a payment or entitlement authority.

## Required safeguards

- Verify Shopify HMAC before any write or email.
- Keep all integration credentials in server-side secret storage.
- Make every provisioning step idempotent and retryable.
- Store no access secrets in GitHub Pages, query strings, product descriptions,
  or analytics events.
- Log consent, fulfilment, reminders, suspensions, and manual overrides.
- Accept source code through a scoped repository transfer or protected upload,
  not an ordinary email attachment.
