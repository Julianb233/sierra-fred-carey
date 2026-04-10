# Feature Landscape: Sahara v9.0 Founder Journey Report & $39 Tier

**Domain:** AI founder coaching platform — completion report + freemium-to-paid conversion
**Researched:** 2026-04-08
**Research mode:** Ecosystem + Feasibility (features dimension only)

---

## Context

Sahara's v9.0 milestone has two coupled goals:

1. **The Report** — When a founder completes all 19 roadmap steps, FRED synthesizes their answers into a polished Founder Journey Report (web view + PDF + email). This is the free-tier graduation artifact.
2. **The $39 Conversion** — The report delivery is the conversion moment. After receiving the report, founders are prompted to upgrade to the new $39/mo Essentials tier.

The critical insight from research: **the report IS the paywall trigger.** The founder has already done the work. The report proves it. The upgrade is the natural next step to execute on what they just built. This is the highest-converting pattern in SaaS — upgrade after value realization, not before.

---

## Table Stakes

Features users expect. Missing = product feels incomplete or the conversion moment falls flat.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| All 19-step answers aggregated into report | Report without the answers is meaningless | Low | Data already exists in DB; needs clean aggregation API |
| FRED-synthesized narrative summaries per section | Raw "what I typed" feels like a form printout, not a report | Medium | AI re-processing pass over each of the 5 sections; positive/upbeat framing |
| Executive summary at the top | Every premium report has an exec summary; absence signals unprofessionalism | Medium | FRED synthesizes all 19 answers into a 3-5 sentence overview of the business |
| Founder name + company name on the report | Personalization is expected; generic report = low perceived value | Low | Already captured in onboarding |
| Report date + version | Founders need to know when the report was generated; signals freshness | Low | Auto-generated metadata |
| Web view of the report | Founders expect to read it on-platform before downloading | Low | `/dashboard/report` page |
| PDF download | Reports that can't be shared offline are incomplete; every competitor offers this | Medium | Branded Sahara PDF via @react-pdf/renderer |
| Email delivery with PDF | Graduation moment requires an email — feels ceremonial; also practical (saves the file) | Low | Resend SDK already integrated |
| Report accessible anytime | Founders return to review; one-time delivery is insufficient | Low | Stored per-founder, retrievable from dashboard |
| Clear upgrade CTA after report delivery | The report IS the conversion moment; no CTA = no conversion | Low | "Ready to turn this model into a structured business?" |
| $39 tier on pricing page | Founders researching tiers need to see it; absent tier causes confusion | Low | UI change only, Stripe product creation required |

---

## Differentiators

Features that make the report feel premium, shareable, and worth the journey. Not universally expected, but they significantly increase perceived value and conversion.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| FRED's voice throughout the report | The report reads like Fred Cary is speaking to the founder, not a form printout. Competitors like Evalyze and ReadyScore produce clinical scores — FRED produces mentorship | Medium | Reuse Fred's voice/tone rules from `lib/fred-brain.ts` and `lib/ai/prompts.ts` |
| AI-suggested bonus steps (1-2 personalized) | Shows FRED understands this specific business, not every business. Creates "wow, it noticed X about me" moment | Medium | FRED analyzes all 19 answers, pattern-matches to Fred's 7 brain enhancements, produces 1-2 personalized next-step suggestions |
| Section-by-section strength indicators | ReadyScore.ai uses 40+ factor scoring; CliftonStrengths uses theme breakdowns. Founders want to know where they're strong — not just what they built | Medium | Simple HIGH/MEDIUM/DEVELOP indicator per section, not a score — avoids gamification trap |
| Shareable report link | Founders will share their report with co-founders, advisors, and investors. Sharing = organic acquisition | Low | Unique shareable URL, no auth required to view (or gated by founder choice) |
| Report as "pitch deck foundation" messaging | Positions the report as more than a summary — it's the raw material for their pitch deck. Creates future pull toward the pitch deck feature | Low | Copy/messaging only in v9.0; data model design for v10.0 pitch deck generator |
| Milestone email with celebratory framing | CliftonStrengths delivers a "congratulations" experience; coaching platforms that celebrate completion see higher net promoter scores | Low | Resend email, already wired. Tone: "You just built your business model. Here's what you created." |
| Upgrade prompt framing: value expansion, not restriction | Spotify's pattern: "you discovered a Premium feature" beats "you're blocked." Grammarly's pattern: show what's possible, don't lock out | Low | Copy design: "You've built the model. Here's what $39 unlocks to execute it." |
| Stage scoring in $39 tier | Investors and accelerators use stage-specific rubrics (pre-seed, seed). Founders want to know where they stand relative to their stage, not in the abstract | High | AI scoring against stage benchmarks; feeds into Investor Readiness |
| Go-to-market strategy output in $39 tier | Most actionable thing after completing the journey. Founders who finish want a plan, not more assessment | High | Reuse Strategy Documents infrastructure already built in v1.0 |
| Priority FRED responses in $39 tier | Perceived value of "your coach answers you first" is high in coaching platforms. Low cost to implement with queue mechanics | Medium | Response latency differentiation or queue priority in API |

---

## Anti-Features

Features to deliberately NOT build in v9.0. These are common mistakes in the report/coaching platform space.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Numeric overall score (e.g., "Your Founder Score: 74/100") | Founders who score low feel judged and disengage. Competitors like ReadyScore use scores, but Sahara's brand is mentorship, not grading. A low score at graduation destroys the celebration moment | Use qualitative section indicators (strength/develop) and stage-specific guidance. Reserve scoring language for Investor Readiness (that's explicitly a score product) |
| Comparison to other founders ("you're in the top 23%") | Leaderboard mechanics in coaching create anxiety, not motivation. Fred's methodology is about the founder's own business, not competition | Focus on forward momentum: "here's what you've built, here's the next step" |
| Overly long report (15+ pages) | CliftonStrengths' full 34-report is 25+ pages — users report feeling overwhelmed. StrengthsFinder review noted "not for personal development dabblers." Sahara's founders are action-oriented | Target 4-6 pages. Executive summary + 5 section summaries + FRED's bonus steps + upgrade CTA. Readable in 10 minutes |
| Generic GTM template disguised as personalized strategy | Founders immediately recognize when an "AI strategy" is a Mad Libs template. Destroys trust. This is the #1 complaint in AI business plan generator reviews (DesignRush 2025 analysis) | Delay GTM strategy to $39 tier so it gets proper AI generation time; or generate on-demand after upgrade |
| Gating the report itself behind $39 | The report IS the conversion mechanism. If you gate the report, you remove the primary free-tier graduation artifact and conversion trigger. This is the "gate too aggressively" trap | Give the full report free; gate the execution layer ($39: stage scoring, GTM, investor readiness, strategy outputs) |
| Hard paywall with no preview of $39 features | Research shows 30% lower conversion when users hit a wall without understanding what they're upgrading to (Profitwell data). "You're blocked" vs "here's what unlocks" | Soft paywall: show the Investor Readiness section header with a teaser score (blurred or locked), reveal what $39 unlocks |
| Asking founders to re-enter data for the $39 features | Friction that kills upgrade intent. If founders already gave 19 answers, $39 features should be pre-populated | All $39 features (investor readiness, GTM, stage scoring) should read from the same 19-step answer store |
| Multiple upgrade prompts during report delivery | Urgency theater kills the celebratory moment. Founders feel manipulated | One clear upgrade CTA at the end of the report. One follow-up email at 24-48 hours. That's it |

---

## Conversion Psychology

What drives free-to-paid at the $39 price point in this specific context. These are design principles for the conversion flow, not features per se.

### The Graduation Moment Pattern

Research finding (HIGH confidence — multiple SaaS conversion studies): Upgrade prompts shown immediately after a user completes a meaningful achievement convert 2.3x better than time-based prompts. Sahara's 19-step completion is the highest-value trigger possible — the founder has invested significant time and built something real.

**Design implication:** The upgrade prompt should appear AFTER the founder has read their report, not before or during delivery. Let them absorb the value, then ask for the upgrade.

### Value Expansion, Not Restriction

Research finding (HIGH confidence — Canva, Spotify, Grammarly documented patterns): Paywalls framed as "unlock more" convert better than "you're blocked." The report already demonstrates Sahara's value. The $39 prompt should expand on that value, not interrupt it.

**Conversion copy framework (matches PROJECT.md intent):**
- Free framing: "You just built your business model."
- $39 framing: "Now turn it into a structured business you can execute."
- Not: "Upgrade to access these locked features."

### The $39 Price Point Psychology

Research finding (MEDIUM confidence — SaaS pricing studies): $39 specifically outperforms both $34 and $40 due to charm pricing + the left-digit effect. $39 is below the psychological $40 threshold and above the "too cheap to be credible" range for a founder coaching product. The price signals substance without requiring a "is this worth it" decision.

**The three-tier structure (Free / $39 / $99 / $249) also benefits from the center-stage effect** — when given multiple options, people disproportionately choose the middle. $39 as the first paid tier makes it feel like the "reasonable choice."

### Soft Paywall Preview in $39 Features

Research finding (HIGH confidence — Chargebee data): Companies that align paywalls with natural product limitations see 25% higher conversion vs. time-based trials. Showing a blurred/locked Investor Readiness section within the free report (with a one-click unlock) is more effective than a separate pricing page.

**Design implication:** The free report should include a section stub for "Investor Readiness Score" that shows the score is calculated but blurred — "Upgrade to $39 to see your score." This is the Canva background-removal pattern applied to the report.

### Completion Rate is the Primary Conversion Lever

Research finding (HIGH confidence — ProductLed): The biggest blocker to free-to-paid conversion is users not reaching the "aha moment" because the free-tier value gap is too large. Sahara's 19-step journey must be genuinely completable to generate conversions.

**Design implication:** The FREE tier must be generous — the entire 19-step journey, FRED responses, and the full report. Gating anything in the journey itself reduces completion rates and therefore conversion. The $39 value is in the execution layer AFTER the journey, not DURING it.

---

## Feature Dependencies

```
19-step answer store (existing)
  └── Report data aggregation API        [v9.0 — REPORT]
        └── FRED synthesis AI pass       [v9.0 — REPORT]
              └── Report web view        [v9.0 — REPORT]
              └── Report PDF             [v9.0 — REPORT]
              └── Report email           [v9.0 — REPORT]
              └── Per-founder storage    [v9.0 — REPORT]
              └── AI bonus steps         [v9.0 — REPORT]
              └── Report as deck data    [future v10.0]

Report delivery
  └── Paywall conversion CTA             [v9.0 — CONVERT]
        └── $39 Stripe product           [v9.0 — TIER39]
              └── Tier gating middleware [v9.0 — TIER39]
                    └── Investor Readiness (gated)   [v9.0 — TIER39]
                    └── Strategy outputs (gated)     [v9.0 — TIER39]
                    └── GTM strategy (gated)         [v9.0 — TIER39]
                    └── Stage scoring (gated)        [v9.0 — TIER39]
                    └── Priority FRED (gated)        [v9.0 — TIER39]

Soft paywall preview (blurred Investor Readiness in free report)
  └── Requires: $39 tier exists AND Investor Readiness scoring implemented
```

**Critical path:** Report aggregation API → FRED synthesis → web view → PDF → email → conversion CTA → $39 Stripe → tier gating. These must be built in order.

---

## MVP Recommendation for v9.0

Build in this priority order:

**Must ship (table stakes — the conversion moment breaks without these):**
1. Report data aggregation API (all 19 answers + metadata)
2. FRED synthesis pass (AI re-processes into narrative summaries, Fred's voice)
3. Report web view (`/dashboard/report`)
4. PDF download (branded Sahara design, @react-pdf/renderer already in stack)
5. Email delivery with PDF on 19-step completion (Resend already wired)
6. Per-founder report storage (Supabase, versioned)
7. Conversion CTA after report delivery
8. $39 Stripe product + checkout + tier gating middleware
9. Pricing page with $39 tier

**High value, ship if time permits:**
10. AI-suggested bonus steps (1-2 personalized post-completion recommendations)
11. Shareable report link
12. Soft paywall preview (blurred Investor Readiness score stub in free report)

**Defer to post-v9.0:**
- Strength indicators per section (nice to have, not conversion-critical)
- Full GTM strategy generation (complex, better as a dedicated v10.0 feature)
- Report as pitch deck foundation data model (v10.0 explicitly)
- Stage scoring full implementation (complex AI scoring, defer to after $39 tier proves out)

---

## Competitive Landscape (Confidence Notes)

| Platform | What They Do | What Sahara Does Better |
|----------|-------------|-------------------------|
| **ReadyScore.ai** | 40+ factor investor readiness score, free questionnaire. Score in minutes. | Sahara's 19 steps build the answers through a mentored journey — ReadyScore is a one-time assessment. FRED has ongoing context ReadyScore doesn't. |
| **Evalyze** ($20/mo) | AI pitch deck analysis, investor matching, readiness score. Free tier: 3 analyses. | Evalyze is transactional (upload deck, get score). Sahara builds the underlying business first. Report is a synthesis of the journey, not a deck analysis. |
| **FoundersPlan** | AI business plan generator, 5-dimension readiness score. Free tool. | Template-based plans are widely recognized as generic. FRED's output is founder-specific, voice-consistent, and built on 19 questions not a single prompt. |
| **CliftonStrengths** ($19.99–$59.99) | Personality-based strengths report, 34 themes, PDF, coaching guide. | Different category, but the premium report model is directly analogous. The $59.99 full report includes action items, blind spots, development guides. Sahara's $39 tier should feel similarly complete. |

**Confidence:** MEDIUM. All competitive data sourced from public pricing pages and WebFetch. Evalyze pricing verified via their website directly. ReadyScore pricing not publicly posted (free assessment, upgrade path unclear).

---

## Sources

- [Evalyze pricing and features](https://www.evalyze.ai/) — WebFetch verified
- [ReadyScore.ai investor ready](https://readyscore.ai/) — 403 on detailed page, public homepage confirmed
- [SaaS pricing psychology — AlterSquare](https://altersquare.medium.com/saas-pricing-psychology-why-29-beats-30-every-time-42949f600d85) — MEDIUM confidence
- [Free trial conversion benchmarks 2025](https://www.1capture.io/blog/free-trial-conversion-benchmarks-2025) — MEDIUM confidence
- [How freemium SaaS products convert with upgrade prompts — Appcues](https://www.appcues.com/blog/best-freemium-upgrade-prompts) — MEDIUM confidence
- [Feature gating strategies for freemium SaaS — Demogo](https://demogo.com/2025/06/25/feature-gating-strategies-for-your-saas-freemium-model-to-boost-conversions/) — MEDIUM confidence
- [CliftonStrengths reports comparison — Strengths on Site](https://www.strengthsonsite.com/cliftonstrengthsreportscomparison) — MEDIUM confidence
- [Investor readiness score dimensions — FasterCapital](https://fastercapital.com/content/Investor-Readiness-Score--Navigating-the-Investor-Landscape--A-Guide-to-Improving-Your-Readiness-Score.html) — MEDIUM confidence
- [The involvement of AI in startup investment-readiness scores 2025 — Equisy](https://equisy.io/the-involvement-of-ai-in-startup-investment-readiness-scores-2025/) — MEDIUM confidence
- [Mastering freemium paywalls — Monetizely](https://www.getmonetizely.com/articles/mastering-freemium-paywalls-strategic-timing-for-saas-success) — MEDIUM confidence
- Sahara PROJECT.md and MILESTONES.md — HIGH confidence (primary source for existing platform context)
