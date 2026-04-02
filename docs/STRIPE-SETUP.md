# Stripe Setup Guide — Sahara

This document lists every Stripe credential needed for Sahara's payment system.
Hand these to the dev team (or set them in Vercel Environment Variables).

## Prerequisites

1. A Stripe account with payments enabled
2. Access to the [Stripe Dashboard](https://dashboard.stripe.com)
3. Both **test mode** keys (for staging) and **live mode** keys (for production)

---

## Required API Keys

### 1. Secret Key (`STRIPE_SECRET_KEY`)

- **Where to find:** Dashboard > Developers > API Keys > Secret key
- **Format:** `sk_live_...` (production) or `sk_test_...` (development)
- **Used by:** Server-side checkout sessions, subscription management, portal

### 2. Publishable Key (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)

- **Where to find:** Dashboard > Developers > API Keys > Publishable key
- **Format:** `pk_live_...` (production) or `pk_test_...` (development)
- **Used by:** Client-side Stripe.js (card forms, checkout redirect)

### 3. Webhook Signing Secret (`STRIPE_WEBHOOK_SECRET`)

- **Where to find:** Dashboard > Developers > Webhooks > Add endpoint
- **Endpoint URL:** `https://joinsahara.com/api/stripe/webhook`
- **Events to subscribe:**
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- **Format:** `whsec_...`
- **Used by:** Server-side webhook verification

---

## Required Price IDs

Create three subscription products in Stripe. Each needs a **recurring monthly** price.

| Tier | Plan Name | Monthly Price | Env Variable |
|------|-----------|---------------|--------------|
| Builder | Builder | $39/mo | `NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID` |
| Pro | Pro (Fundraising) | $99/mo | `NEXT_PUBLIC_STRIPE_FUNDRAISING_PRICE_ID` |
| Studio | Studio (Venture Studio) | $249/mo | `NEXT_PUBLIC_STRIPE_VENTURE_STUDIO_PRICE_ID` |

### How to create a product + price:

1. Go to Dashboard > Products > Add product
2. Name: e.g. "Sahara Builder"
3. Pricing model: Standard pricing
4. Price: $39.00, Recurring, Monthly
5. Save — then copy the `price_xxx` ID from the pricing section

---

## Optional Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `STRIPE_TRIALS_ENABLED` | `false` | Set to `true` to enable 14-day free trials |

---

## Where to Set These

### Vercel (Production)

1. Go to [Vercel Dashboard](https://vercel.com) > sierra-fred-carey > Settings > Environment Variables
2. Add each variable for the **Production** environment
3. For staging/preview, use **test mode** keys (`sk_test_...`, `pk_test_...`)

### Local Development

Copy to `.env.local`:

```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_FUNDRAISING_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_VENTURE_STUDIO_PRICE_ID=price_...
```

### Validate

Run the validation script to check all required vars:

```bash
npx tsx scripts/validate-env.ts
```

---

## Checklist for William

- [ ] Stripe account created and verified
- [ ] API keys obtained (secret + publishable)
- [ ] Three subscription products created (Builder $39, Pro $99, Studio $249)
- [ ] Price IDs copied for each product
- [ ] Webhook endpoint configured at `https://joinsahara.com/api/stripe/webhook`
- [ ] Webhook signing secret obtained
- [ ] All 6 values shared with dev team (Julian/agent)

---

*Related Linear issues: AI-3524, AI-3519, PERS-382*
