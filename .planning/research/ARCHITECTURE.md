# Architecture Patterns: Sahara v9.0 — Founder Journey Report & $39 Tier

**Domain:** AI-generated founder report with PDF delivery and paywall conversion
**Researched:** 2026-04-08
**Scope:** How report generation, storage, delivery, and the Builder tier integrate with the existing Next.js 16 / Supabase / Stripe / Vercel Blob stack

---

## Existing Architecture Baseline

Before designing the v9.0 additions, the load-bearing patterns to extend:

| Layer | Implementation |
|-------|---------------|
| Auth | Supabase Auth + JWT, `requireAuth()` helper, RLS on every user table |
| Tier gating (API) | `checkTierForRequest(req, UserTier.X)` in every route handler |
| Tier gating (UI) | `<FeatureLock requiredTier={...} currentTier={...}>` wrapper component |
| Tier resolution | `getUserTier(userId)` → reads `user_subscriptions` (Stripe) → falls back to `profiles.tier` |
| Stripe integration | `createCheckoutSession()` → webhook → `createOrUpdateSubscription()` → `profiles.tier` update |
| Journey data | `oases_progress` table (per-user, per-stage, per-step completions with JSONB metadata) |
| Founder memory | `fred_episodic_memory`, `fred_semantic_memory` — vector-embedded, tier-gated depth |
| AI generation | Vercel AI SDK 6, model routing via `TIER_MODEL_MAP`, non-streaming for documents |
| PDF | `@react-pdf/renderer` with `renderToBuffer()`, pattern established in `/api/dashboard/export` |
| Blob storage | `@vercel/blob` `put()` call — existing path pattern: `{category}/{userId}/{timestamp}-{name}` |
| Email | `sendEmail()` from `lib/email/send.ts` — Resend SDK, records sends in `email_sends` table |
| Existing tiers | FREE (0), BUILDER (1, $39), PRO (2, $99), STUDIO (3, $249) |

**Critical observation:** The BUILDER tier at $39 already exists in `lib/stripe/config.ts` and `lib/constants.ts`. The `NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID` env var references it. v9.0 does not create a new tier — it activates and fully implements the already-named Builder tier.

---

## Recommended Architecture

### High-Level Component Map

```
[Supabase: oases_progress + fred_semantic_memory]
              |
              | (aggregate 19 step answers)
              v
[POST /api/report/generate]
  - requireAuth()
  - checkTierForRequest(BUILDER)  ← gates generation behind $39
  - loadStepAnswers(userId)        ← pulls from oases_progress.metadata + semantic memory
  - callFREDSynthesis(answers)     ← Vercel AI SDK, structured output, non-streaming
  - renderToBuffer(ReportPDF)      ← @react-pdf/renderer
  - put(blob, reports/{userId}/...) ← Vercel Blob
  - upsertFounderReport(db, ...)  ← new founder_reports table
  - sendEmail(reportEmail)         ← Resend with PDF attachment
  - return { reportId, webUrl, blobUrl }
              |
              v
[GET /api/report/:reportId]         ← serve web view of latest report
[GET /api/report/:reportId/pdf]     ← redirect to signed Blob URL

              +--------------------------------------+
              |                                      |
[/dashboard/report] page            [Paywall CTA component]
  - web rendition of report           - shown to FREE users
  - "Download PDF" button             - shown post-generation
  - Version history panel             - deep-links to /pricing?plan=builder
  - Upgrade CTA (if FREE viewing)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `POST /api/report/generate` | Orchestrate full pipeline: answer aggregation → FRED synthesis → PDF render → Blob upload → DB write → email send | `oases_progress`, `fred_semantic_memory`, Vercel AI, `@react-pdf/renderer`, `@vercel/blob`, `email/send.ts`, `founder_reports` table |
| `GET /api/report/[reportId]` | Return structured report JSON for web rendering; enforce ownership via RLS | `founder_reports` table |
| `GET /api/report/[reportId]/pdf` | Return redirect to Vercel Blob URL (or regenerate on-demand) | `founder_reports.pdf_blob_url` |
| `lib/report/aggregator.ts` | Pull all 19 roadmap step answers from `oases_progress.metadata` and `fred_semantic_memory`; map to report sections | Supabase service client |
| `lib/report/synthesizer.ts` | Pass aggregated answers to FRED for re-synthesis (structured output, not streaming) | Vercel AI SDK, FRED system prompt |
| `lib/report/pdf-template.tsx` | `@react-pdf/renderer` component tree for branded PDF; exported as React.createElement tree (no JSX in .ts) | None — pure rendering |
| `lib/report/pdf-renderer.ts` | Wrap `renderToBuffer(ReportPDF)`, handle errors | `pdf-template.tsx`, `@react-pdf/renderer` |
| `lib/report/email-template.tsx` | React Email component for report delivery email | `lib/email/send.ts` |
| `lib/db/founder-reports.ts` | CRUD for `founder_reports` table | Supabase service client |
| `components/report/ReportView.tsx` | Web rendition of the report; client component | `GET /api/report/[reportId]` |
| `components/report/ReportPaywallCTA.tsx` | Upgrade prompt shown to FREE users where report would appear | `/pricing?plan=builder` |
| `app/dashboard/report/page.tsx` | Dashboard page; checks tier, renders `ReportView` or `ReportPaywallCTA` | `GET /api/report/latest` |

---

## Data Flow: Step Completion → Report → PDF → Email → Paywall

```
1. ANSWER ACCUMULATION (ongoing, during journey)
   - Founder completes roadmap steps via FRED conversations
   - Each step completion writes to oases_progress:
       { user_id, stage, step_id, metadata: { answer: "...", distilled: "..." } }
   - FRED's memory extraction (extractMemoryUpdates) also persists key facts
     to fred_semantic_memory for retrieval

2. REPORT TRIGGER (user-initiated, gated to BUILDER+)
   POST /api/report/generate
   ├── Auth check: requireAuth()
   ├── Tier check: checkTierForRequest(req, UserTier.BUILDER)
   │   └── If FREE: 403 with upgradeUrl: "/pricing?plan=builder"
   ├── Answer aggregation: lib/report/aggregator.ts
   │   ├── SELECT from oases_progress WHERE user_id = ? (all stages)
   │   ├── Extract metadata.answer per step_id
   │   ├── Map 19 roadmap items → sections (5 sections × ~4 steps)
   │   └── Supplement missing answers from fred_semantic_memory facts
   ├── FRED synthesis: lib/report/synthesizer.ts
   │   ├── Build system prompt: FRED identity + positive-tone instruction
   │   ├── Pass aggregated answers as structured input
   │   ├── Use generateObject() (Vercel AI SDK structured output, NOT streaming)
   │   ├── Output: ReportData { sections[], executiveSummary, highlights[] }
   │   └── Model: PRO model tier (GPT-4o) regardless of user tier
   ├── PDF render: lib/report/pdf-renderer.ts
   │   ├── renderToBuffer(ReportPDF({ data, founderName, date }))
   │   └── Returns Buffer
   ├── Blob upload: @vercel/blob put()
   │   └── Path: reports/{userId}/{reportVersion}-founder-journey-report.pdf
   ├── DB write: lib/db/founder-reports.ts upsertFounderReport()
   │   ├── Upsert into founder_reports (versioned, see schema below)
   │   └── Returns reportId
   └── Email: sendEmail(FounderReportEmail, { pdfBuffer, founderName })
       └── Uses Resend with PDF as base64 attachment

3. WEB DELIVERY (dashboard page)
   GET /dashboard/report
   ├── Server component reads tier (via getUserTier())
   ├── BUILDER+: renders <ReportView reportId={latest.id} />
   │   └── Fetches GET /api/report/[reportId] for structured JSON
   └── FREE: renders <ReportPaywallCTA />
       └── Shows blurred preview + "Unlock Full Report — $39/mo" CTA

4. PDF DOWNLOAD
   GET /api/report/[reportId]/pdf
   └── Reads founder_reports.pdf_blob_url → redirect 302

5. PAYWALL CONVERSION
   - ReportPaywallCTA links to /pricing?plan=builder&source=report
   - /pricing page reads ?plan= param to pre-highlight Builder tier
   - Existing createCheckoutSession() handles Stripe checkout
   - Stripe webhook → createOrUpdateSubscription() → profiles.tier = BUILDER
   - On next page load, tier check passes and ReportView renders
```

---

## Database Schema Additions

### New Table: `founder_reports`

```sql
CREATE TABLE IF NOT EXISTS founder_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL DEFAULT 1,
  -- Synthesized content stored as JSONB for web rendering
  report_data     JSONB NOT NULL,              -- ReportData struct (sections, summary, highlights)
  -- Step snapshot at generation time (for diffing future versions)
  step_snapshot   JSONB NOT NULL DEFAULT '{}', -- { step_id: answer, ... }
  -- Storage
  pdf_blob_url    TEXT,                        -- Vercel Blob public URL
  pdf_size_bytes  INTEGER,
  -- Delivery tracking
  email_sent_at   TIMESTAMPTZ,
  email_status    TEXT,                        -- 'sent' | 'failed' | 'skipped'
  -- Generation metadata
  model_used      TEXT,                        -- e.g. 'gpt-4o'
  generation_ms   INTEGER,                     -- latency for monitoring
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, version)
);

-- Latest report lookup (common query)
CREATE INDEX IF NOT EXISTS idx_founder_reports_user_version
  ON founder_reports(user_id, version DESC);

-- RLS: users see only their own reports
ALTER TABLE founder_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own reports"
  ON founder_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access founder_reports"
  ON founder_reports FOR ALL
  USING (auth.role() = 'service_role');
```

### Existing Tables Extended (no schema change needed)

- `oases_progress.metadata` JSONB already stores arbitrary per-step data. The aggregator reads `metadata->>'answer'` and `metadata->>'distilled'` from this column. No migration required — the convention is additive.
- `email_sends` already exists and the `sendEmail()` call writes to it with `emailType: 'founder_report'`.
- `user_subscriptions` and `profiles.tier` already handle the BUILDER tier — the Stripe price ID just needs to be live in the environment.

### TypeScript Types (`types/report.ts`)

```typescript
export interface ReportSection {
  id: string                // matches roadmap section id
  title: string             // e.g. "Your Problem & Market"
  synthesized: string       // FRED-generated prose (2-4 paragraphs)
  highlights: string[]      // 3-5 bullet highlights extracted from synthesis
  stepIds: string[]         // which oases step_ids contributed to this section
}

export interface ReportData {
  executiveSummary: string  // 1 paragraph FRED synthesis of entire journey
  founderName: string
  companyName: string
  generatedAt: string       // ISO 8601
  sections: ReportSection[]
  fredSignoff: string       // FRED closing statement, encouraging tone
}

export interface FounderReport {
  id: string
  userId: string
  version: number
  reportData: ReportData
  stepSnapshot: Record<string, string>
  pdfBlobUrl: string | null
  generatedAt: Date
}
```

---

## API Route Structure

```
app/api/report/
  generate/
    route.ts      POST — trigger full generation pipeline (BUILDER+ gated)
  [reportId]/
    route.ts      GET  — fetch report JSON for web rendering (owns check via RLS)
    pdf/
      route.ts    GET  — redirect to Vercel Blob URL
  latest/
    route.ts      GET  — shortcut: fetch most recent report for authed user
```

### `POST /api/report/generate` contract

```typescript
// Request: no body required — all data comes from user's own journey records
// Response (200):
{
  success: true,
  data: {
    reportId: string,
    version: number,
    webUrl: string,         // /dashboard/report?id={reportId}
    pdfBlobUrl: string,
    emailSent: boolean
  }
}

// Response (403) — FREE tier:
{
  success: false,
  error: "Builder tier required",
  code: "TIER_REQUIRED",
  requiredTier: "Builder",
  currentTier: "Free",
  upgradeUrl: "/pricing?plan=builder&source=report_generate"
}

// Response (422) — insufficient journey data:
{
  success: false,
  error: "Not enough journey data to generate report",
  code: "INSUFFICIENT_DATA",
  completedSteps: 3,
  minimumSteps: 5          // configurable constant
}
```

---

## How the $39 Builder Tier Fits the Existing Architecture

### What Already Exists

The BUILDER tier is fully defined in two files:

- `lib/stripe/config.ts`: `PLANS.BUILDER` with `priceId: process.env.NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID`
- `lib/constants.ts`: `UserTier.BUILDER = 1`, `TIER_NAMES`, `TIER_BADGES`, `TIER_FEATURES`, `MEMORY_CONFIG.builder`
- `lib/constants.ts`: `canAccessFeature(userTier, requiredTier)` — `userTier >= requiredTier` — BUILDER already passes for BUILDER-gated features

### What v9.0 Activates

1. **Stripe product**: Create the `price_builder` product in Stripe dashboard and set `NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID` in Vercel environment. The checkout and webhook code already handles it.

2. **Feature gate**: `checkTierForRequest(req, UserTier.BUILDER)` in `POST /api/report/generate`. This is the identical pattern to `checkTierForRequest(req, UserTier.PRO)` used in `/api/fred/strategy/route.ts`.

3. **UI gate**: `<FeatureLock requiredTier={UserTier.BUILDER} currentTier={userTier} featureName="Founder Journey Report">` wrapping the ReportView on the dashboard page.

4. **Pricing page**: Ensure the Builder card is visible and prominent with the report as its headline feature.

5. **Paywall CTA linking**: `ReportPaywallCTA` passes `?plan=builder&source=report` to `/pricing` so the pricing page can pre-highlight the right card. This is a UI convention, not a code pattern that exists yet — add `?plan=` reading to the pricing page component.

### Tier Ordering Means BUILDER Gate is Free-User-Only

Because `canAccessFeature` uses `>=`, anyone on PRO ($99) or STUDIO ($249) also gets the Founder Journey Report at no extra cost. This is correct — the report is a selling point for upgrading from FREE to BUILDER, not a differentiator between upper tiers.

---

## Architecture Patterns to Follow

### Pattern 1: Route = Orchestrator, Lib = Logic

FRED's strategy generation separates the route from the business logic:
- `app/api/fred/strategy/route.ts` — auth, tier gate, param parsing, error wrapping
- `lib/fred/strategy.ts` — `generateDocument()`, `saveStrategyDocument()`

Follow the same split for reports:
- `app/api/report/generate/route.ts` — auth, tier gate, request validation
- `lib/report/aggregator.ts` — data assembly
- `lib/report/synthesizer.ts` — AI call
- `lib/report/pdf-renderer.ts` — PDF generation
- `lib/db/founder-reports.ts` — DB writes

### Pattern 2: renderToBuffer with React.createElement (not JSX)

The existing `app/api/dashboard/export/route.ts` uses `React.createElement()` directly because the file is `.ts`, not `.tsx`. The PDF template is the one place where `.tsx` is acceptable (create `lib/report/pdf-template.tsx`), then import it into the `.ts` renderer file.

### Pattern 3: sendEmail Tracking

`lib/email/send.ts` accepts a `tracking` object that writes to `email_sends`. Use:

```typescript
await sendEmail({
  to: founderEmail,
  subject: `Your Founder Journey Report is ready, ${founderName}`,
  react: React.createElement(FounderReportEmail, { founderName, reportUrl }),
  tracking: {
    userId,
    emailType: 'founder_report',
    emailSubtype: `v${version}`,
  }
})
```

**PDF attachment note:** Resend supports attachments. Pass `attachments: [{ filename: 'founder-journey-report.pdf', content: pdfBuffer.toString('base64') }]` alongside `react`. This is not in the current `sendEmail()` signature — extend it with an optional `attachments` param rather than bypassing the shared function.

### Pattern 4: Versioned Storage Path

Follow the Vercel Blob path convention in `lib/storage/upload.ts`:

```
reports/{userId}/{timestamp}-v{version}-founder-journey-report.pdf
```

Use `addRandomSuffix: false` (matches existing pattern) so the URL is deterministic if needed for cache invalidation.

### Pattern 5: Service Client for Generation, User Client for Reads

Generation is a server-side background operation — use `createServiceClient()` to bypass RLS for writes. For the `GET /api/report/[reportId]` read endpoint, use the user-scoped `createClient()` and let RLS enforce ownership.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Streaming the Report Generation Response

FRED's chat endpoint (`POST /api/fred/chat`) uses `StreamingTextResponse` because the UX requires it. The report generation does not — it's a triggered job, not a chat turn. Use `generateObject()` (Vercel AI SDK structured output) for the FRED synthesis call. This returns a typed `ReportData` object directly and is easier to persist and version.

If generation takes longer than Vercel's 60s function limit (possible for complex synthesis + PDF), move the synthesis to a background job via Trigger.dev (already in `package.json` as `trigger`). Check: `trigger/` directory exists in the repo, indicating prior infrastructure. For v9.0, attempt synchronous generation first — if timeouts occur in testing, migrate to async with a polling endpoint.

### Anti-Pattern 2: Generating PDF in the Browser

`@react-pdf/renderer` can run client-side, but this leaks the FRED synthesis output to the browser and makes attachment-via-email impossible. Keep `renderToBuffer()` server-side only.

### Anti-Pattern 3: Storing Full Report HTML in oases_progress

`oases_progress.metadata` is designed for per-step data. The full synthesized report belongs in its own `founder_reports` table. Do not stuff multi-kilobyte synthesis output into step metadata.

### Anti-Pattern 4: One Stripe Product for Both Report and Subscription

The $39/mo Builder plan is a recurring subscription, not a one-time purchase. Use Stripe's `mode: "subscription"` (already the default in `createCheckoutSession()`). Do not create a separate one-time price for "the report" — the report is a feature of the subscription.

### Anti-Pattern 5: Bypassing the FeatureLock Component for UI Gating

The `FeatureLock` component handles both tier gating and Oases stage gating and renders the correct upgrade prompt. Use it rather than writing ad-hoc `if (tier >= BUILDER)` checks in page components — this ensures the upgrade CTA is consistent with the rest of the app.

---

## Build Order (Dependencies)

Build in this sequence to avoid blocking yourself:

```
1. DATABASE
   - Migration: create founder_reports table
   - Verify RLS policies
   - lib/db/founder-reports.ts (CRUD functions)

2. STRIPE ACTIVATION
   - Create Builder product + price in Stripe dashboard
   - Set NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID in Vercel env
   - Verify existing checkout + webhook handles it (no code change needed)
   - Test: subscribe a user to Builder, confirm profiles.tier = 1

3. ANSWER AGGREGATOR
   - lib/report/aggregator.ts
   - loadStepAnswers(userId): queries oases_progress, maps step_id → answer
   - Defines the 19-step → 5-section mapping as a constant
   - Unit-testable without AI or PDF

4. FRED SYNTHESIZER
   - lib/report/synthesizer.ts
   - Takes aggregated answers → calls generateObject() → returns ReportData
   - Use FRED system prompt with explicit positive-tone instruction
   - Unit-testable with mocked AI provider

5. PDF TEMPLATE + RENDERER
   - lib/report/pdf-template.tsx — visual layout component
   - lib/report/pdf-renderer.ts — renderToBuffer wrapper
   - Can be developed and visually tested independently of the API route

6. EMAIL TEMPLATE
   - lib/report/email-template.tsx — React Email component
   - Extend lib/email/send.ts to accept optional attachments param

7. GENERATION API ROUTE
   - app/api/report/generate/route.ts
   - Orchestrates steps 3-6 in sequence
   - Writes to founder_reports, triggers email

8. READ ROUTES
   - app/api/report/[reportId]/route.ts
   - app/api/report/[reportId]/pdf/route.ts
   - app/api/report/latest/route.ts

9. DASHBOARD PAGE + COMPONENTS
   - components/report/ReportView.tsx
   - components/report/ReportPaywallCTA.tsx
   - app/dashboard/report/page.tsx
   - Add "Report" nav item to DASHBOARD_NAV in lib/constants.ts (tier: UserTier.BUILDER)

10. PRICING PAGE UPDATE
    - Read ?plan=builder from URL params to pre-highlight Builder card
    - Ensure Builder card shows "Founder Journey Report" as headline feature
```

---

## Scalability Considerations

| Concern | Current Scale | At 1K founders | At 10K founders |
|---------|--------------|----------------|-----------------|
| Report generation latency | Single Vercel function, 60s limit | Fine | Move to Trigger.dev background job if p95 > 30s |
| PDF storage cost | Vercel Blob ~$0.023/GB/mo | Negligible | Implement TTL/archival for old versions beyond v5 |
| Email delivery | Resend, generous free tier | Fine | Monitor `email_sends` failure rates |
| Synthesis cost | GPT-4o per report, ~4K tokens in + 2K out | ~$0.10/report | Cache synthesis if step_snapshot unchanged (hash comparison) |
| Concurrent generation | No queue | Risk of duplicate reports | `UNIQUE(user_id, version)` prevents duplicates; add optimistic lock |

**Caching strategy:** Before calling FRED synthesis, hash the `step_snapshot` and compare to the last `founder_reports` row's snapshot hash. If identical (founder hasn't completed new steps since last generation), return the existing report immediately without re-generating.

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Existing tier architecture | HIGH | Read `lib/constants.ts`, `lib/stripe/config.ts`, `lib/middleware/tier-guard.ts`, `lib/api/tier-middleware.ts` directly |
| BUILDER tier already defined | HIGH | `lib/stripe/config.ts` line 16-27, `UserTier.BUILDER = 1` in `lib/constants.ts` |
| @react-pdf/renderer usage pattern | HIGH | `app/api/dashboard/export/route.ts` — renderToBuffer with React.createElement confirmed |
| oases_progress schema | HIGH | Read `supabase/migrations/20260308000002_oases_progress_table.sql` directly |
| Vercel Blob path convention | HIGH | Read `lib/storage/upload.ts` directly |
| sendEmail signature | HIGH | Read `lib/email/send.ts` directly |
| 19-step → 5-section mapping | MEDIUM | `nineStepMapping` field exists in `JOURNEY_STEPS` but the exact 19-item roadmap list is referenced in project context, not directly confirmed in a single source file |
| Resend attachment support | MEDIUM | Resend API supports attachments (standard capability), not verified against current Resend SDK version in this codebase |
| Trigger.dev availability | MEDIUM | `trigger/` directory and `trigger.config.ts` exist in root, indicating installed; not deeply audited |
