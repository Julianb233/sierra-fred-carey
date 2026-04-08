# Requirements — v9.0 Founder Journey Report & $39 Tier

**Milestone:** v9.0
**Defined:** 2026-04-08
**Source:** Research (FEATURES.md, SUMMARY.md, ARCHITECTURE.md, PITFALLS.md)
**Core Value:** Founders can make better decisions faster using FRED's structured cognitive frameworks — honest analysis, scored recommendations, and clear next actions.
**Previous:** v1.0-v8.0 requirements archived (all shipped or carried)

---

## v9.0 Scope (18 requirements, 4 categories)

### Report Generation (5)

- [ ] **RGEN-01**: All 19 roadmap step answers aggregated into a structured report with 5 sections (Core Offer, Founder Story, Unit Economics, Scaling Operations, Leadership Mindset)
- [ ] **RGEN-02**: FRED re-synthesizes each section into richer narrative summaries — positive/upbeat but grounded in the founder's actual answers, never generic
- [ ] **RGEN-03**: Executive summary generated at the top — 3-5 sentence FRED synthesis of the entire business model
- [ ] **RGEN-04**: AI-suggested bonus steps — FRED analyzes the specific business and recommends 1-2 personalized next steps after completion
- [ ] **RGEN-05**: Anti-sycophancy guardrails — synthesis uses temperature 0.3-0.5, grounds in original answers, no generic startup phrases without evidence

### Report Delivery (4)

- [ ] **RDEL-01**: Web view of the report at `/dashboard/report` showing all sections with synthesized content
- [ ] **RDEL-02**: Branded Sahara PDF download generated via `@react-pdf/renderer` through Trigger.dev background job
- [ ] **RDEL-03**: Email delivered on report completion with Vercel Blob URL link (NOT PDF attachment)
- [ ] **RDEL-04**: Per-founder report storage in `founder_reports` table — versioned, with step snapshot for diffing

### $39 Essentials Tier (7)

- [ ] **TIER-01**: Stripe product and $39/mo price created and activated via `NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID` env var
- [ ] **TIER-02**: BUILDER tier properly in UserTier enum, getTierFromString, and webhook handler — unit tested
- [ ] **TIER-03**: Tier gating middleware recognizes BUILDER between FREE and PRO
- [ ] **TIER-04**: Pricing page updated with 4 tiers: Free / $39 Essentials / $99 Pro / $249 Studio
- [ ] **TIER-05**: Webhook hardening — `resolveUserIdFromSubscription` falls back to DB customer lookup if metadata missing
- [ ] **TIER-06**: Strategy outputs (plans, roadmaps) gated at $39 BUILDER tier
- [ ] **TIER-07**: Go-to-market strategy generation gated at $39 BUILDER tier

### Conversion Flow (2)

- [ ] **CONV-01**: Upgrade CTA displayed after report delivery — "You've built the model. Ready to turn this into a structured business?"
- [ ] **CONV-02**: FeatureLock on report page — FREE users see paywall CTA, BUILDER+ users see full report
- [ ] **CONV-03**: Soft paywall preview — blurred/locked Investor Readiness section stub in free report teasing $99 value
- [ ] **CONV-04**: Shareable report link — unique URL founders can share with co-founders, advisors, investors

---

## v10.0 (Deferred)

### Report Enhancements

- **RGEN-06**: Report as pitch deck data model — structure report data to feed future deck generator
- **CONV-05**: Strength indicators per section (HIGH/MEDIUM/DEVELOP qualitative markers)

### $99 Pro Tier Features

- **TIER-08**: First year summary generation — AI financial/operational year-one plan
- **TIER-09**: Stage scoring & guidance with pre-seed/seed benchmarks
- **TIER-10**: Priority FRED responses — queue priority or latency differentiation for Pro users

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Numeric overall founder score | Destroys celebration moment; Sahara is mentorship, not grading |
| Comparison to other founders | Leaderboard mechanics create anxiety in coaching context |
| 15+ page report | Overwhelms action-oriented founders; target 4-6 pages |
| PDF email attachment | Spam filter risk degrades Resend sender reputation; use Blob URL link |
| Generic GTM templates | Founders immediately recognize Mad Libs; destroys trust |
| Report behind hard paywall | Report IS the conversion trigger; gating it kills completion rate |
| Multiple upgrade prompts | Urgency theater kills celebratory moment; one CTA at end |
| Full RLHF for report quality | Wrong scale; prompt engineering with guardrails is sufficient |

---

## Cross-Cutting Constraints

1. **FRED Voice Preservation:** Report synthesis must sound like Fred Cary — mentored, specific, grounded. Not corporate-speak.
2. **Anti-Sycophancy:** Temperature 0.3-0.5, ground in original answers, quality gate for generic phrases.
3. **No Inline renderToBuffer:** PDF generation through Trigger.dev background job, never inline in API route.
4. **Email Deliverability:** Blob URL link in email body, never PDF attachment.
5. **Tier Ordering:** BUILDER (1) between FREE (0) and PRO (2); `canAccessFeature` uses `>=` comparison.
6. **Report Target:** 4-6 pages, readable in 10 minutes.

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RGEN-01 | Phase 92 | Complete |
| RGEN-02 | Phase 92 | Complete |
| RGEN-03 | Phase 92 | Complete |
| RGEN-04 | Phase 92 | Complete |
| RGEN-05 | Phase 92 | Complete |
| RDEL-01 | Phase 94 | Pending |
| RDEL-02 | Phase 93 | Complete |
| RDEL-03 | Phase 94 | Pending |
| RDEL-04 | Phase 91+93 | Complete |
| TIER-01 | Phase 91 | Complete (placeholder — Stripe sk_live needed for prod) |
| TIER-02 | Phase 91 | Complete |
| TIER-03 | Phase 91 | Complete |
| TIER-04 | Phase 95 | Pending |
| TIER-05 | Phase 91 | Complete |
| TIER-06 | Phase 95 | Pending |
| TIER-07 | Phase 95 | Pending |
| CONV-01 | Phase 96 | Pending |
| CONV-02 | Phase 96 | Pending |
| CONV-03 | Phase 96 | Pending |
| CONV-04 | Phase 96 | Pending |

**Coverage:**
- v9.0 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after v9.0 milestone definition*
