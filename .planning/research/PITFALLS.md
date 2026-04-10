# Domain Pitfalls — Sahara v9.0: Founder Journey Report & $39 Essentials Tier

**Domain:** AI founder coaching platform — pricing tier addition, PDF report generation, AI re-synthesis, paywall conversion
**Researched:** 2026-04-08
**Scope:** Sahara-specific risks for v9.0 (Next.js 16, Supabase, Stripe existing setup, Vercel, @react-pdf/renderer, Vercel AI SDK 6, Trigger.dev)

---

## Critical Pitfalls

Mistakes that cause rewrites, billing failures, or user trust loss.

---

### Pitfall C1: BUILDER tier inserted between FREE and FUNDRAISING breaks `getPlanByPriceId` and tier comparison logic

**Severity:** CRITICAL

**What goes wrong:**
The existing `lib/stripe/config.ts` defines plans as a const object (`FREE → FUNDRAISING → VENTURE_STUDIO`). The BUILDER tier at $39 already exists in the config (confirmed in codebase), but any logic that compares tiers by position, array index, or price amount rather than explicit tier ID will silently mis-rank it. Example: a check like `plan.price >= 99` to gate Pro features will correctly exclude BUILDER, but `Object.keys(PLANS).indexOf(plan.id) >= 2` will return wrong results if BUILDER is at index 1.

The webhook handler uses `getTierFromString(plan.id)` → `UserTier` enum. If the `UserTier` enum in `lib/constants.ts` does not include `BUILDER` as a distinct value, the webhook will silently fall through to `FREE` for every BUILDER checkout completion.

**Why it happens:**
Developers add the Stripe product and price ID but forget to add the corresponding enum value and tier-comparison branches in middleware, FeatureLock, and the webhook handler.

**Consequences:**
- BUILDER subscribers get FREE tier access after checkout completes
- Stripe receives money; user gets nothing; churn and chargebacks follow
- FeatureLock gates that check `tier >= 'fundraising'` still work correctly, but gates checking `tier !== 'free'` may pass when they should not

**Prevention:**
1. Add `BUILDER = 'builder'` to the `UserTier` enum before writing any product code
2. Grep for every place `UserTier.FREE` is the default fallback in tier resolution and add explicit `BUILDER` handling
3. Write a unit test: `getPlanByPriceId(BUILDER_PRICE_ID)` returns the BUILDER plan with `id === 'builder'`
4. After shipping, use Stripe CLI to trigger `checkout.session.completed` for the BUILDER price ID and confirm the DB row reflects `tier = 'builder'`

**Warning signs:**
- `getTierFromString` returns `FREE` for an unknown string (check `lib/constants.ts` for the fallback branch)
- FeatureLock does not recognize `'builder'` as a valid tier key
- `resolveUserIdFromSubscription` logs "No userId found" for BUILDER checkouts (metadata mismatch)

**Phase:** Tier setup — do this before any report or paywall work.

---

### Pitfall C2: `renderToBuffer` from `@react-pdf/renderer` times out on Vercel Hobby (10s) and is borderline on Vercel Pro (60s)

**Severity:** CRITICAL

**What goes wrong:**
The existing `app/api/dashboard/export/route.ts` uses `renderToBuffer` synchronously inside a Vercel serverless function. For a simple momentum report this may finish in 3-8 seconds. A Founder Journey Report synthesizing 19 steps of AI-generated narrative — including longer text sections, branding, and potentially custom fonts — will take significantly longer. On Vercel Hobby the function will 504 before the PDF is generated. On Vercel Pro the 60-second limit is reachable for complex reports.

Additionally, `@react-pdf/renderer` has a confirmed, long-standing memory leak on every `renderToBuffer` call in Node.js (GitHub issues #718, #2848, #3051 in the diegomura/react-pdf repo): memory allocated during render never fully reclaims. In a serverless context each invocation is fresh, so the leak does not accumulate — but it means peak memory during render is higher than expected, and cold starts after a garbage collection period are slower.

**Why it happens:**
The existing export route works fine for the simple dashboard report because that PDF is small. Founders assume the same pattern will scale to the full journey report.

**Consequences:**
- User clicks "Generate Report," watches a spinner for 60 seconds, then gets a 504 error
- Vercel Pro function timeout is 60s by default; a multi-page narrative PDF with 19 sections can exceed this
- Report generation becomes unreliable; founders abandon the conversion moment

**Prevention:**
Use Trigger.dev (already in stack, `trigger.config.ts` sets `maxDuration: 600`) for report generation. The flow:
1. API route receives the generation request, immediately returns `202 Accepted` with a `jobId`
2. Trigger.dev task runs `renderToBuffer` with full headroom (up to 10 minutes)
3. On completion, upload PDF to Vercel Blob, write the URL to Supabase `founder_reports` table
4. Frontend polls `/api/report/status?jobId=...` or subscribes to Supabase Realtime on the report row
5. When status flips to `complete`, surface the PDF download link

Do NOT inline `renderToBuffer` in the report generation API route for a document of this complexity.

**Warning signs:**
- Dev machine generates the PDF fine (no timeout constraint locally)
- Vercel function logs show `FUNCTION_INVOCATION_TIMEOUT` on the first production test
- The existing export route takes >5 seconds for a dense dashboard report

**Phase:** PDF generation architecture — establish the Trigger.dev path before writing the report template.

---

### Pitfall C3: Stripe webhook fires `customer.subscription.updated` before the UI has confirmed checkout, causing the user to see inconsistent tier state

**Severity:** CRITICAL

**What goes wrong:**
Stripe's webhook delivery order is not guaranteed. `customer.subscription.updated` sometimes arrives at `/api/stripe/webhook` before `checkout.session.completed`. The current webhook handler already handles `customer.subscription.created` and `customer.subscription.updated` by calling `resolveUserIdFromSubscription`, but that function relies on subscription metadata (`userId`) set during checkout session creation. If the `customer.subscription.updated` event arrives first, `resolveUserIdFromSubscription` may find a subscription without metadata (Stripe created the subscription before the metadata from `checkout.session.completed` is available), and the handler will log "No userId found" and mark the event failed.

**Why it happens:**
The checkout flow creates the Stripe subscription, then fires both events nearly simultaneously. Network delivery order at Vercel is non-deterministic.

**Consequences:**
- User completes checkout; Stripe Dashboard shows subscription active
- Webhook handler fails to associate subscription with a `userId`
- User returns to Sahara; their tier is still FREE; they paid $39 and get nothing
- Support ticket arrives; manual fix required

**Prevention:**
In `resolveUserIdFromSubscription`, if no `userId` is found in subscription metadata, fall back to looking up the Stripe customer ID in the `user_subscriptions` table to find the associated user. If the customer row was created during a prior free-tier signup or a previous checkout, the `stripe_customer_id` will already exist in the DB. This is the belt-and-suspenders approach.

Additionally, consider a short retry: if `userId` cannot be resolved, enqueue a delayed re-attempt (5 seconds) rather than immediately marking the event failed.

**Warning signs:**
- Stripe Dashboard shows events with HTTP 200 responses but user tier is not updated
- `stripe_events` table has rows with `status = 'failed'` and error message containing "No userId found"
- The issue appears intermittently (not on every checkout)

**Phase:** Webhook hardening — audit before shipping the BUILDER checkout flow.

---

## High Severity Pitfalls

Mistakes that cause significant user frustration, lost conversions, or technical debt requiring rework.

---

### Pitfall H1: FRED re-synthesizes founder answers into an over-positive, sycophantic narrative that destroys report credibility

**Severity:** HIGH

**What goes wrong:**
RLHF-trained models (Claude included) are structurally biased toward positive, encouraging responses — sycophancy is documented at the model level, not just a prompt problem. When FRED is asked to "re-synthesize this founder's raw answer into a richer, more detailed, positive narrative," the instruction "positive" combined with FRED's coaching persona creates a compounding effect: weak business fundamentals get reframed as strengths, vague answers get padded with optimistic language, and the report reads like a participation trophy.

Founders who receive the report will notice immediately if it does not reflect honest feedback they've received from FRED during the journey. If the report contradicts FRED's in-session coaching tone, it feels generated rather than personal.

OpenAI's April 2025 GPT-4o incident (rolled back after 4 days for excessive flattery) is the highest-profile case, but the tendency is present in all current-generation models.

**Why it happens:**
The prompt instructs FRED to produce a "positive narrative" without guardrails defining what "positive" means. The model interprets "positive" as "make the founder feel good" rather than "accurate and constructive."

**Consequences:**
- Founders share the report; readers see hollow corporate-speak and lose trust in Sahara
- The report fails its conversion job — it does not feel earned because it says nothing real
- FRED's brand as a straight-talking mentor is undermined by a sugar-coated document

**Prevention:**
1. Define "positive" in the system prompt as "actionable and strength-focused, not evasive or generic." Explicitly instruct the model to preserve the specific details and honest assessments from the founder's answers — amplify clarity and specificity, not optimism.
2. Instruct FRED to ground every re-synthesized section in the founder's actual stated answer. Include a constraint: "Do not introduce claims, capabilities, or advantages that are not present in the original answer."
3. Include a temperature of 0.3-0.5 for report generation (not the default 0.7+ used for conversational coaching). Lower temperature = less creative license = less hallucination risk.
4. Build a one-line "quality gate" prompt that separately evaluates each section for specificity — flag sections containing generic startup phrases like "passionate team," "strong market opportunity," "proven track record" without specific evidence.

**Warning signs:**
- Every section of the generated report contains the words "passionate," "unique," or "positioned for success"
- Two founders with very different business types receive reports with the same structural language
- FRED's mid-journey honesty ("this market is crowded, here's what differentiates you") is absent from the report's framing of the same topic

**Phase:** AI synthesis prompt engineering — lock the prompt before building the report template.

---

### Pitfall H2: Paywall presented at the wrong moment converts nobody

**Severity:** HIGH

**What goes wrong:**
The report is the conversion moment — but only if the founder has experienced enough of FRED's value to justify $39/month. Two failure modes:

**Mode A (too early):** The paywall appears before or during the 19-step journey, before the founder has seen what FRED can do. Result: "I don't know what I'm paying for" — 0% conversion.

**Mode B (wrong framing after):** The founder completes all 19 steps, gets their full report for free, feels satisfied, and sees no reason to pay. If the report is the graduation gift, it should preview Essentials tier value — not be the entire value. The paywall must appear *after* the aha moment but *before* the full unlocked experience.

Research from RevenueCAT shows animated, personalized paywalls convert 2.9x better than static ones. The highest-converting moment is when the user is "actively experiencing a limitation that matters to them."

**Why it happens:**
The natural instinct is to give the full report as a reward for completing the journey. But if the report is fully rendered and downloadable for free, the upgrade to $39/mo has no urgency.

**Consequences:**
- 2-5% freemium-to-paid conversion is the SaaS baseline; poor timing pushes Sahara toward the bottom of that range or below
- Founders complete the journey, download the PDF, and churn without ever engaging with FRED again

**Prevention:**
Structure the report as a layered reveal:
1. Free tier: Summary section ("Here's your founder snapshot") + 3 of 19 sections unlocked
2. The remaining 16 sections are visible but blurred/locked with a preview of FRED's analysis
3. The upgrade CTA appears inline in the locked sections, with FRED's voice explaining what's behind the lock
4. After upgrade, the full report unlocks instantly (no re-generation; it was already generated)

This means the PDF generation happens before the paywall, but the PDF download is gated. The paywall is a reveal, not a request.

**Warning signs:**
- Founders complete the journey and do not return within 48 hours
- PostHog shows high completion rate for step 19 but low click rate on the upgrade CTA
- The upgrade CTA is on a separate pricing page rather than inline with the report

**Phase:** Paywall UX design — decide the reveal structure before building the report generation pipeline.

---

### Pitfall H3: PDF stored as a one-time generated blob creates support debt when founders ask for regeneration

**Severity:** HIGH

**What goes wrong:**
If each report is generated once and stored in Vercel Blob at a static URL, the system breaks when:
- A founder requests regeneration after updating answers in a later session
- The PDF URL expires (Vercel Blob URLs can be private with signed expiry)
- The report template changes in v10.0 and existing stored reports look outdated
- A founder deletes their account and the blob is orphaned

Without versioning, there is no way to determine if a stored report reflects the founder's current answers or an old snapshot. The support question "my report is outdated" has no answer.

**Why it happens:**
The simplest implementation stores the blob URL directly on the user row. Nobody thinks about versioning until a founder complains.

**Consequences:**
- Stored PDFs reference answers the founder has since changed; report is factually stale
- Supabase Storage costs grow unchecked as old versions are never pruned
- "Regenerate report" becomes a support-ticket workflow instead of a self-serve action

**Prevention:**
Design the schema from the start with versioning in mind:

```sql
CREATE TABLE founder_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | generating | complete | failed
  blob_url TEXT,
  trigger_job_id TEXT, -- Trigger.dev job ID for status polling
  answers_snapshot JSONB, -- Snapshot of all 19 step answers at generation time
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, version)
);
```

Store the `answers_snapshot` at generation time so you always know what data was used. Implement a "Regenerate" button that creates a new version row rather than overwriting the existing one. Keep the last 3 versions per user; prune older ones via a Supabase scheduled function.

**Warning signs:**
- The initial schema stores `report_url TEXT` directly on the `users` or `profiles` table
- There is no `generated_at` timestamp
- There is no status column (no way to check if generation is still in progress)

**Phase:** Schema design — lock the `founder_reports` table structure before writing any generation code.

---

### Pitfall H4: Email with PDF attachment is filtered to spam or rejected

**Severity:** HIGH

**What goes wrong:**
Sending the report PDF as an email attachment via Resend (already in stack) will trigger spam filters on Gmail, Outlook, and Apple Mail. PDFs are one of the five file types most commonly associated with malicious email (F-Secure research: 85% of malicious emails include .PDF attachments). Emails over 110KB begin experiencing deliverability degradation; a multi-page report PDF will be significantly larger.

Even if the email is delivered, it lands in the Promotions tab on Gmail, which founders rarely monitor.

**Why it happens:**
Attaching the PDF feels natural — "email the report" — but email deliverability rules treat PDF attachments from transactional senders with suspicion.

**Consequences:**
- Founder completes journey, pays $39, does not receive their report email, and assumes the product is broken
- Resend sender reputation degrades if emails are marked as spam
- The conversion moment (opening the report) is delayed or missed entirely

**Prevention:**
Never attach the PDF. Instead:
1. Upload the PDF to Vercel Blob with a signed URL (24-hour or 7-day expiry, renewable on access)
2. Send a transactional email via Resend with a styled CTA button linking to the signed URL
3. The email body includes FRED's voice: a 2-3 sentence personal message about what's in the report, driving the click
4. Also store the report URL in the Sahara dashboard so the founder can access it without the email

The email body should be under 50KB (text + one small image), well within deliverability thresholds.

**Warning signs:**
- The implementation plan includes `attachment: pdfBuffer` in the Resend API call
- No Vercel Blob URL is generated as part of the pipeline
- There is no report access route in the dashboard

**Phase:** Email delivery design — decide on the link-not-attachment approach before writing the email template.

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or friction without being catastrophic.

---

### Pitfall M1: Proration creates a confusing invoice when BUILDER founders upgrade to Pro

**Severity:** MEDIUM

**What goes wrong:**
When a BUILDER ($39/mo) subscriber upgrades to FUNDRAISING ($99/mo) mid-cycle, Stripe creates a prorated invoice. The founder sees a charge for, say, $43.87 — which is neither $39 nor $99 and has no obvious explanation. The `customer.subscription.updated` webhook fires, the tier upgrades correctly, but the invoice email from Stripe says "$43.87 — Subscription update" with no clear line items in the email preview.

**Prevention:**
1. Set `proration_behavior: 'always_invoice'` on subscription updates so proration is immediately charged and visible
2. Add a proration explainer in the upgrade confirmation modal: "You'll be charged $X today for the remaining days in your billing cycle, then $99/mo going forward"
3. Consider `proration_behavior: 'none'` with `billing_cycle_anchor: 'now'` to restart the billing cycle cleanly — simpler math, clearer expectation
4. Do not use `subscription_schedules` for this simple two-tier upgrade unless you need future-dated changes

**Warning signs:**
- Support tickets asking "why was I charged $43?" within 24 hours of the upgrade flow shipping
- No proration explanation in the upgrade modal

**Phase:** Billing UX — before launching the upgrade flow.

---

### Pitfall M2: Cold start latency on the PDF generation Trigger.dev task causes "still generating" to persist for minutes

**Severity:** MEDIUM

**What goes wrong:**
Trigger.dev tasks start a new worker process on cold start. For a task that imports `@react-pdf/renderer` (a heavy dependency), the cold start can take 10-20 seconds before the actual generation begins. The Supabase Realtime subscription the frontend uses to poll `founder_reports.status` will correctly show `pending → generating → complete`, but if the user closes the browser tab during the cold start, they return to find `status = 'generating'` with no clear ETA.

**Prevention:**
1. Set a `generatingStartedAt` timestamp when the Trigger.dev task begins (not when the API route creates the row) so the frontend can calculate "generating for X minutes"
2. Set a maximum generation time expectation in the UI: "Reports typically ready in 1-3 minutes"
3. If `status` is still `generating` after 5 minutes, surface a "Something went wrong — retry" button that creates a new Trigger.dev task for the same report version
4. Warm the Trigger.dev task by pinging it from a cron (Trigger.dev supports cron tasks) to reduce cold start frequency

**Warning signs:**
- Founders return to the dashboard after 10+ minutes and the report is still "generating"
- No timeout/retry logic in the generation pipeline

**Phase:** Report generation UX — when building the status polling UI.

---

### Pitfall M3: The AI synthesis step in the Trigger.dev task hits Anthropic rate limits for high-concurrency generation

**Severity:** MEDIUM

**What goes wrong:**
Each report generation makes 19 separate AI calls (one per step) through FRED/Vercel AI SDK 6. If multiple founders complete their journeys simultaneously and trigger report generation at the same time, concurrent Anthropic API calls will spike. Anthropic's default rate limits for Claude on the API tier are measured in tokens-per-minute and requests-per-minute. Hitting the limit returns a 429; Trigger.dev will retry, but with exponential backoff this can extend report generation to 10+ minutes.

**Prevention:**
1. Batch the 19 synthesis calls with `Promise.all` but with a concurrency limiter (e.g., `p-limit` with concurrency 5) — faster than serial, safer than full-parallel
2. Alternatively, combine all 19 steps into a single prompt with structured output: "Here are 19 founder answers. Return a JSON object with key `sections`, each containing a re-synthesized version." One API call instead of 19 reduces rate-limit exposure by 19x and reduces latency
3. Add Anthropic error handling in the Trigger.dev task: catch 429 errors explicitly and wait for the retry-after header duration before retrying
4. Monitor Anthropic usage in the Trigger.dev task log so you can see when limits are approached

**Warning signs:**
- `TriggerDev` task logs show repeated 429 errors with exponential backoff
- Report generation reliably completes in under 2 minutes for single users but fails under load

**Phase:** AI synthesis implementation — when writing the generation task.

---

### Pitfall M4: Supabase Realtime subscription for report status does not reconnect after tab visibility change

**Severity:** MEDIUM

**What goes wrong:**
The standard pattern for polling report status is a Supabase Realtime channel subscription on the `founder_reports` table filtered by `user_id`. When the browser tab goes to the background (founder switches to email, Slack, etc.), mobile browsers and some desktop browsers throttle or close WebSocket connections. When the tab returns to focus, the Realtime subscription may be stale or disconnected. The UI shows `generating` indefinitely even though the Supabase row has `status = 'complete'`.

**Prevention:**
1. Add a `visibilitychange` event listener that re-fetches the report status via a direct Supabase query (not Realtime) on tab focus
2. Set a polling fallback: if Realtime does not fire within 30 seconds of the generating state being entered, poll `/api/report/status` every 10 seconds as a fallback
3. Use `supabase.channel().on('system', {event: 'disconnected'})` to detect connection drops and re-subscribe

**Warning signs:**
- QA testing shows report completes but UI never updates after switching tabs
- No `visibilitychange` handler in the report status component

**Phase:** Report status UI — when building the frontend polling component.

---

## Minor Pitfalls

Addressable quickly but worth tracking.

---

### Pitfall N1: Custom fonts in the PDF render as fallback Helvetica on first generation

**Severity:** LOW

**What goes wrong:**
`@react-pdf/renderer` requires fonts to be registered via `Font.register()` before first use. In a serverless context, font files must be fetched from a URL (not loaded from the filesystem, which is not reliably available in Vercel's serverless environment). If the font URL is a Vercel Blob URL or CDN URL that is slow on first request, the PDF will fall back to Helvetica with no error thrown. The generated PDF looks off-brand.

**Prevention:**
1. Host fonts on a CDN with cache-control headers set to long TTL (fonts are immutable by filename)
2. Use `Font.register()` with the exact public URL at the top of the render module
3. Add a test assertion: generate a one-page PDF and check that the font name in the metadata matches the expected typeface (use `pdf-parse` which is already in the stack)

---

### Pitfall N2: FeatureLock component does not handle the `pending` subscription state

**Severity:** LOW

**What goes wrong:**
Between the founder completing checkout and the webhook processing the `checkout.session.completed` event (typically 1-5 seconds), the user's subscription status in the DB is still `free`. If they immediately navigate to a gated feature, FeatureLock shows the paywall. The founder just paid and immediately hits a "you need to upgrade" message. This is a trust-destroying experience even if it self-resolves in seconds.

**Prevention:**
1. After checkout redirect, store a `pending_upgrade: true` flag in localStorage for 30 seconds
2. FeatureLock reads this flag and shows a "Activating your Essentials access..." state instead of the paywall
3. Poll `/api/user/subscription` every 2 seconds while `pending_upgrade` is true; clear the flag when the tier upgrades

---

### Pitfall N3: `vercel.json` `maxDuration` not set for the report generation API route

**Severity:** LOW

**What goes wrong:**
Even if report generation is offloaded to Trigger.dev, the API route that creates the Trigger.dev task and waits for initial confirmation still runs within a Vercel function. If the Trigger.dev SDK initialization or task enqueue call is slow, the API route may approach the default function timeout. Vercel defaults to 10 seconds on Hobby (already a risk) and requires explicit `maxDuration` configuration to extend on Pro.

**Prevention:**
Add to `vercel.json`:
```json
{
  "functions": {
    "app/api/report/generate/route.ts": { "maxDuration": 30 }
  }
}
```
The API route should do nothing more than enqueue the Trigger.dev task and return — it should never be close to timeout. But set the explicit duration as a safety net.

---

## Phase-Specific Warning Map

| Phase | Pitfall | Mitigation |
|-------|---------|------------|
| Tier setup | C1 — BUILDER tier not in UserTier enum | Add enum value first; unit test tier resolution |
| Webhook hardening | C3 — webhook ordering race | Add DB-based customer lookup fallback in resolveUserId |
| Schema design | H3 — no report versioning | Use `founder_reports` table with version + snapshot |
| AI prompt engineering | H1 — sycophantic re-synthesis | Low temperature + specificity constraints in FRED prompt |
| PDF architecture | C2 — renderToBuffer timeout | Offload to Trigger.dev; never inline in API route |
| Paywall UX design | H2 — wrong conversion timing | Layered reveal: show report preview, gate full version |
| Email delivery | H4 — PDF attachment spam | Vercel Blob signed URL in email body, never attachment |
| Report status UI | M4 — Realtime stale on tab switch | Polling fallback + visibilitychange re-fetch |
| AI generation task | M3 — Anthropic rate limits | Single batched prompt or p-limit concurrency cap |
| Billing UX | M1 — confusing proration invoice | Proration explainer in upgrade modal |

---

## Sources

- Stripe webhook ordering behavior: [Using webhooks with subscriptions](https://docs.stripe.com/billing/subscriptions/webhooks), [Best practices for Stripe webhooks — Stigg](https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks)
- Stripe proration complexity: [Prorations — Stripe Docs](https://docs.stripe.com/billing/subscriptions/prorations), [Subscription upgrade/downgrade guide — Stigg](https://www.stigg.io/blog-posts/the-only-guide-youll-ever-need-to-implement-upgrade-downgrade-flows-part-2)
- react-pdf/renderer memory leak: [GitHub Issue #718](https://github.com/diegomura/react-pdf/issues/718), [GitHub Issue #2848](https://github.com/diegomura/react-pdf/issues/2848)
- Vercel serverless timeouts: [Vercel KB — Function Timeouts](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out), [Inngest — How to solve Next.js timeouts](https://www.inngest.com/blog/how-to-solve-nextjs-timeouts)
- Vercel AI SDK timeout docs: [ai-sdk.dev Troubleshooting — Timeout on Vercel](https://ai-sdk.dev/docs/troubleshooting/timeout-on-vercel)
- AI sycophancy: [OpenAI April 2025 GPT-4o rollback — Axios](https://www.axios.com/2025/07/07/ai-sycophancy-chatbots-mental-health), [Programmed to please — Springer Nature](https://link.springer.com/article/10.1007/s43681-026-01007-4)
- Paywall conversion timing: [Finding the right UX point for a paywall](https://www.sankalpjonna.com/posts/finding-the-right-point-in-your-ux-to-trigger-a-paywall), [RevenueCAT — How top apps approach paywalls](https://www.revenuecat.com/blog/growth/how-top-apps-approach-paywalls/)
- Email attachment deliverability: [Mailforge — How attachments impact deliverability](https://www.mailforge.ai/blog/how-attachments-impact-email-deliverability), [Mailtrap — Email size limits](https://mailtrap.io/blog/email-size/)
- Idempotency implementation: [Hookdeck — Webhook idempotency](https://hookdeck.com/webhooks/guides/implement-webhook-idempotency)
