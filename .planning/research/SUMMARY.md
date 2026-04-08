# Research Summary — v9.0 Founder Journey Report & $39 Tier

**Project:** Sahara v9.0
**Synthesized:** 2026-04-08
**Overall confidence:** HIGH
**Inputs:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

---

## Executive Summary

- **Zero new npm installs required.** `@react-pdf/renderer`, `resend`, `@vercel/blob`, `ai`, `@ai-sdk/anthropic`, `@trigger.dev/sdk`, and `stripe` are all already installed. This is a pure feature-development milestone on proven infrastructure.

- **The BUILDER tier already exists in code.** `PLANS.BUILDER` in `lib/stripe/config.ts` and `UserTier.BUILDER = 1` in `lib/constants.ts` are defined. v9.0 activates it by creating the Stripe product and setting the env var — no tier plumbing needed.

- **FRED's voice in the report is THE differentiator.** Competitors (Evalyze, ReadyScore, FoundersPlan) produce clinical scores or template plans. FRED producing a mentored, Fred Cary-voiced narrative report is what no one else has. The report must sound like Fred, not a form printout.

- **The report is the paywall trigger, not a gated feature.** Research confirms upgrade prompts shown after meaningful completion convert 2.3x better than time-based prompts. The conversion moment is: founder reads report → sees what $39 unlocks → upgrades.

- **Do NOT inline PDF generation in a Vercel function.** Use Trigger.dev (already installed) for the full pipeline: AI synthesis → PDF render → Blob upload → email. The existing `renderToBuffer` pattern works for simple exports but will timeout for a 19-section narrative report.

- **Do NOT email the PDF as an attachment.** PDF attachments trigger spam filters and degrade Resend sender reputation. Upload to Vercel Blob, email a styled link with FRED's voice.

- **The critical design decision is the paywall strategy.** Two research dimensions disagree:
  - Features research says: "Give the full report free, gate the execution layer ($39 = investor readiness, GTM, strategy)"
  - Pitfalls research says: "Layered reveal — show 3 of 19 sections free, gate the rest behind $39"
  - **Resolution needed before implementation.** This is a product decision, not a technical one.

---

## Stack Consensus

**Recommendation: Zero new infrastructure. Extend everything that exists.**

| Capability | Library | Already Installed? | Confidence |
|---|---|---|---|
| PDF generation | `@react-pdf/renderer` v4.3.1→4.4.0 | Yes | HIGH |
| PDF storage | `@vercel/blob` v2.0.0 | Yes | HIGH |
| Email delivery | `resend` v6.9.1 | Yes | HIGH |
| AI synthesis | `ai` + `@ai-sdk/anthropic` | Yes | HIGH |
| Background jobs | `@trigger.dev/sdk` v4.4.1 | Yes | MEDIUM |
| Stripe tier | `stripe` v20.1.0 | Yes | HIGH |

**Rejected:** Puppeteer (150MB bundle, cold-start), jsPDF (client-only, rasterized), pdf-lib (wrong tool for generation).

---

## Feature Priorities

### Table Stakes (must ship)

1. Report data aggregation API (19 step answers from `oases_progress.metadata`)
2. FRED synthesis (AI re-processes into richer narrative, Fred's voice, positive-but-honest)
3. Report web view (`/dashboard/report`)
4. PDF download (branded Sahara, `@react-pdf/renderer`)
5. Email delivery with Blob URL link (NOT attachment)
6. Per-founder report storage (versioned, `founder_reports` table)
7. Conversion CTA after report delivery
8. $39 Stripe product activation + pricing page update

### High Value (ship if time permits)

9. AI-suggested bonus steps (1-2 personalized post-completion)
10. Shareable report link
11. Soft paywall preview (blurred Investor Readiness stub in free report)

### Defer to v10.0

- Full GTM strategy generation (complex, better as dedicated feature)
- Report as pitch deck data model (architecture for it now, build later)
- Stage scoring full implementation (complex AI scoring)
- Strength indicators per section (nice-to-have)

---

## Architecture Blueprint

### Data Flow

```
ANSWER ACCUMULATION (during journey)
  oases_progress.metadata → { answer, distilled } per step
       │
       v
POST /api/report/generate (BUILDER+ gated)
  ├── lib/report/aggregator.ts → pulls 19 step answers
  ├── lib/report/synthesizer.ts → FRED AI synthesis (generateObject)
  ├── lib/report/pdf-renderer.ts → renderToBuffer (via Trigger.dev)
  ├── @vercel/blob put() → stores PDF
  ├── lib/db/founder-reports.ts → upsert report record
  └── lib/email/send.ts → email with Blob URL link
       │
       v
GET /api/report/[reportId] → web view JSON
GET /api/report/[reportId]/pdf → redirect to Blob URL
       │
       v
/dashboard/report page
  ├── BUILDER+: <ReportView> with download button
  └── FREE: <ReportPaywallCTA> → /pricing?plan=builder
```

### New Database Table

One new table: `founder_reports` with versioning, JSONB `report_data` for web rendering, `step_snapshot` for diffing, `pdf_blob_url` for storage, RLS for user isolation.

### Existing Patterns Extended

- Tier gating: `checkTierForRequest(req, UserTier.BUILDER)` — same as Pro gating
- UI gating: `<FeatureLock requiredTier={UserTier.BUILDER}>` — same pattern
- PDF: `renderToBuffer` from existing `app/api/dashboard/export/route.ts`
- Email: `sendEmail()` with new optional `attachments` param (or just Blob URL)
- Blob: same path convention as pitch deck storage

---

## Critical Pitfalls (MUST Address)

| # | Pitfall | Severity | Phase | Prevention |
|---|---------|----------|-------|------------|
| C1 | BUILDER not properly in UserTier enum / webhook handler | CRITICAL | Tier setup | Add enum value + unit test `getTierFromString('builder')` before any product code |
| C2 | renderToBuffer timeout on Vercel for 19-section report | CRITICAL | PDF architecture | Use Trigger.dev; never inline in API route |
| C3 | Stripe webhook ordering race (`subscription.updated` before `session.completed`) | CRITICAL | Webhook hardening | Fallback to DB-based customer lookup in `resolveUserIdFromSubscription` |
| H1 | FRED re-synthesizes into sycophantic corporate-speak | HIGH | AI synthesis | Temperature 0.3-0.5, ground in original answers, no generic startup phrases |
| H2 | Paywall at wrong moment converts nobody | HIGH | Paywall design | Layered reveal or clear value preview; CTA after report consumption |
| H4 | PDF email attachment spam-filtered | HIGH | Email delivery | Blob URL link in email, never attachment |

---

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation (Schema + Tier Activation)
- Migration: `founder_reports` table with versioning + RLS
- Verify BUILDER tier in `UserTier` enum, `getTierFromString`, webhook handler
- Create Stripe product/price, set env var
- Test: checkout → webhook → tier = BUILDER
- **Addresses:** C1, C3, H3
- **Standard patterns:** Yes, skip research

### Phase 2: Report Data Pipeline
- `lib/report/aggregator.ts` — pull 19 answers from `oases_progress`
- `lib/report/synthesizer.ts` — FRED AI synthesis with anti-sycophancy guardrails
- Single batched prompt (all 19 answers → one structured output call)
- Temperature 0.3, grounded in original answers
- **Addresses:** H1, M3
- **Needs attention:** Synthesis prompt quality is the highest-leverage work in v9.0

### Phase 3: PDF + Storage
- `lib/report/pdf-template.tsx` — branded Sahara PDF layout
- `lib/report/pdf-renderer.ts` — renderToBuffer via Trigger.dev task
- Blob upload with versioned path
- Font registration (Geist TTF discrete weights)
- **Addresses:** C2, N1
- **Architecture decision:** Trigger.dev async (recommended) vs. synchronous (risky)

### Phase 4: Delivery (Email + Web View)
- Email template with Blob URL link (not attachment)
- Extend `sendEmail()` if needed
- Report web view page (`/dashboard/report`)
- Report read API routes
- Status polling UI (Supabase Realtime + visibilitychange fallback)
- **Addresses:** H4, M2, M4

### Phase 5: Conversion Flow
- Paywall CTA component after report delivery
- Pricing page update (Builder card, `?plan=builder` param)
- FeatureLock for report page (FREE sees CTA, BUILDER+ sees report)
- Pending-upgrade localStorage flag to prevent post-checkout paywall flash
- **Addresses:** H2, N2
- **Product decision required:** Full report free vs. layered reveal

### Phase 6: Polish + Bonus Features (if time)
- AI-suggested bonus steps
- Shareable report link
- Soft paywall preview (blurred section stub)
- Report regeneration UX

### Phase Ordering Rationale
1. **Phase 1 before everything:** Cannot test checkout or gate features without the tier working
2. **Phase 2 before Phase 3:** PDF template needs synthesized content to render
3. **Phase 3 before Phase 4:** Email needs Blob URL, web view needs report data
4. **Phase 4 before Phase 5:** Conversion CTA needs the report to exist
5. **Phase 5 depends on product decision:** Paywall strategy must be decided before building

### Parallel Opportunities
- Phase 1 (schema + Stripe) and Phase 2 (aggregator + synthesizer) can run in parallel — no dependency
- Phase 3 (PDF) and Phase 4 (email template) have light overlap — email template can start while PDF is in progress
- Phase 5 and Phase 6 are sequential (conversion before polish)

### Research Flags
| Phase | More Research? | Reason |
|-------|---------------|--------|
| Phase 1 | No | Standard schema + Stripe activation |
| Phase 2 | No | AI synthesis prompt is the work; research complete |
| Phase 3 | Light | Geist font TTF availability; Trigger.dev task setup |
| Phase 4 | No | Standard email + web view |
| Phase 5 | **YES** | Paywall strategy needs product decision |
| Phase 6 | No | Standard feature work |

---

## Open Questions

1. **Paywall strategy:** Full report free (gate execution layer) vs. layered reveal (3 sections free, gate the rest)? This is the biggest product decision in v9.0.
2. **Font availability:** Are Geist variable font discrete-weight TTFs available, or does the PDF need a different brand font?
3. **Shareable links:** Should founders choose public vs. private for their report? Privacy decision needed.
4. **Investor Readiness in $39:** Currently gated at Pro. Confirm it moves to Builder tier.
5. **19-step mapping source:** The exact 19-item roadmap exists in the UI but needs a single authoritative source file in the codebase.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack (zero new deps) | HIGH | Verified against package.json + existing working code |
| BUILDER tier exists | HIGH | Read lib/stripe/config.ts and lib/constants.ts directly |
| PDF pattern works | HIGH | Existing renderToBuffer route in the codebase |
| Critical pitfalls (C1-C3) | HIGH | Codebase-verified webhook + tier issues |
| Feature priorities | MEDIUM-HIGH | Based on competitor analysis + SaaS conversion research |
| Paywall strategy | MEDIUM | Two valid approaches; needs product decision |
| Trigger.dev for PDF | MEDIUM | Installed but not battle-tested for this specific pipeline |

**Overall: HIGH.** The domain is well-understood, the stack is already in place, and the existing codebase provides strong patterns to follow. The main uncertainty is the paywall strategy (product decision) and Trigger.dev performance for PDF generation (testable in Phase 3).

---

## Sources

Aggregated from all 4 research files. See individual files for full citation lists.

**First-Party (HIGH):**
- Sahara codebase: `lib/stripe/config.ts`, `lib/constants.ts`, `app/api/dashboard/export/route.ts`, `lib/email/send.ts`, `lib/storage/upload.ts`, `supabase/migrations/`

**Stack (HIGH):**
- Vercel Functions Limits (April 2026), @react-pdf/renderer npm registry, react-pdf GitHub issues, Resend docs, Stripe docs

**Features (MEDIUM-HIGH):**
- Evalyze, ReadyScore, FoundersPlan competitor analysis, CliftonStrengths report model, SaaS pricing psychology studies

**Pitfalls (HIGH):**
- Stripe webhook ordering docs, react-pdf memory leak issues, Vercel timeout documentation, OpenAI GPT-4o sycophancy rollback, email deliverability research
