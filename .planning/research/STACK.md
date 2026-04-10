# Technology Stack — Sahara v9.0 Founder Journey Report & $39 Tier

**Project:** Sahara (joinsahara.com)
**Researched:** 2026-04-08
**Scope:** Additive libraries for v9.0 milestone only. Existing Next.js 16 / React 19 / Supabase / Stripe / Vercel AI SDK / Resend / Vercel Blob stack is unchanged.

---

## TL;DR Recommendation

**Use `@react-pdf/renderer` (already installed at v4.3.1, current is v4.4.0) for all PDF generation. Do not add Puppeteer/Chromium.** The codebase already has a working `renderToBuffer` route at `app/api/dashboard/export/route.ts` that proves the approach works on this React 19 + Next.js 16 stack. Extend that pattern for the Founder Journey Report.

---

## Vercel Runtime Constraints (Verified — April 2026)

Source: [Vercel Functions Limits](https://vercel.com/docs/functions/limitations)

| Constraint | Value |
|---|---|
| Max duration (Hobby) | 300s with fluid compute enabled |
| Max duration (Pro) | 800s with fluid compute enabled |
| Bundle size (uncompressed) | 250 MB |
| Memory | 2 GB Hobby / 4 GB Pro |
| Request/response body | 4.5 MB |

**Key correction from outdated community guidance:** The old "10s Hobby / 60s Pro" figures are stale. With fluid compute, both plans now support 300s+ durations. Chromium's size constraint (~150MB uncompressed) is a real risk but the timeout concern is far less acute than previously assumed.

---

## PDF Generation — Primary Recommendation

### Use: `@react-pdf/renderer` v4.4.0

**Current version in package.json:** `^4.3.1` (semver range includes 4.4.0, npm will resolve to latest)
**Current latest:** 4.4.0 (published April 7, 2026)
**Confidence:** HIGH — verified via npm registry + existing working route in this codebase

**Why this, not Puppeteer:**

1. **Already installed and working.** `app/api/dashboard/export/route.ts` uses `renderToBuffer` in a Next.js App Router route handler on React 19. The historical issue that caused crashes (`TypeError: ba.Component is not a constructor`) was a Next.js 14.1.0 bug fixed in 14.1.1. This project runs Next.js 16 + React 19, which fully resolves it.

2. **Zero additional bundle size.** Adding Puppeteer/Chromium would consume ~150MB of the 250MB bundle limit. `@react-pdf/renderer` adds nothing — it's already in node_modules.

3. **No cold-start Chromium spin-up.** Puppeteer on Vercel requires either bundling a Chromium binary (bundle size risk) or downloading at runtime via `@sparticuz/chromium-min` from GitHub releases (network dependency, cold-start latency, brittleness). React-pdf generates PDF natively in Node.js with no subprocess.

4. **Sufficient styling control for branded reports.** Supports custom TTF/WOFF fonts via `Font.register()`, flexbox layout, images (PNG/JPEG/base64), absolute positioning, page breaks, headers/footers with `fixed` prop. The Sahara brand uses Geist (Google Fonts) which can be fetched and registered. Limitation: no CSS gradients, no SVG support.

5. **Generation speed.** React-pdf renders in 200-800ms for multi-page text-heavy documents. Puppeteer requires 3-8 seconds minimum (browser launch + render + PDF export).

**Known limitation to plan around:** JSX cannot be used directly in `.ts` route handler files. The existing codebase pattern (`React.createElement` calls in `route.ts`) is the correct workaround, or extract PDF components into `.tsx` files imported by the route. Both patterns are proven in this codebase.

**Font registration for branding:**
```typescript
import { Font } from '@react-pdf/renderer'

Font.register({
  family: 'Geist',
  fonts: [
    { src: 'https://fonts.gstatic.com/.../Geist-Regular.ttf' },
    { src: 'https://fonts.gstatic.com/.../Geist-Bold.ttf', fontWeight: 'bold' },
  ],
})
```
Only TTF and WOFF are supported. Variable fonts (e.g., Geist variable) do not work — register discrete weight files.

**No version bump needed.** `^4.3.1` already pulls 4.4.0. No `npm install` required.

---

## PDF Generation — Approaches Rejected

### Puppeteer + @sparticuz/chromium

**Verdict: Do not use.**

- Chromium binary is ~150MB uncompressed, consuming 60% of the 250MB Vercel bundle limit
- Cold-start latency: 3-8 seconds for browser launch before any PDF work begins
- `@sparticuz/chromium-min` downloads the binary at runtime from GitHub releases — adds network dependency and failure mode
- Styling is pixel-perfect HTML/CSS but the report needs to match the PDF spec, not a web viewport
- Overkill: Puppeteer is the right choice when rendering complex interactive UI or when the source is HTML you don't control. FRED reports are AI-synthesized structured text, ideal for react-pdf's layout model.

Source: [Vercel Puppeteer guide](https://vercel.com/kb/guide/deploying-puppeteer-with-nextjs-on-vercel), [bundle size discussion](https://github.com/vercel/community/discussions/103)

### html-to-pdf / jsPDF + html2canvas

**Verdict: Do not use.**

- Client-side only (runs in browser); incompatible with server-side generation required for email delivery
- `html2canvas` produces rasterized screenshots, not vector PDF text — poor print quality, large file sizes
- No automated delivery without a round-trip through the browser

### pdf-lib

**Verdict: Not suitable for this use case.**

- `pdf-lib` (already in package.json indirectly) is excellent for PDF manipulation (merging, stamping, form-filling existing PDFs) but not for generating complex layout documents from scratch
- No React component model, requires manual coordinate-based layout
- Higher development cost for equivalent output vs react-pdf

---

## Email Delivery of PDF Attachment

### Use: `resend` v6.9.1 (already installed)

**Confidence:** HIGH — Resend natively supports `Buffer` attachments. Pattern is trivial.

```typescript
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

// pdfBuffer is the Buffer returned by renderToBuffer()
await resend.emails.send({
  from: 'FRED <fred@joinsahara.com>',
  to: founder.email,
  subject: 'Your Founder Journey Report',
  react: <FounderReportEmail founderName={founder.name} />,
  attachments: [
    {
      filename: 'founder-journey-report.pdf',
      content: pdfBuffer,
    },
  ],
})
```

**Constraint:** Resend's attachment support does not work with scheduled emails (the `scheduledAt` field). If the report email needs to be delayed, upload to Vercel Blob first and send a link instead of an attachment, or use Trigger.dev to orchestrate (see below).

**4.5MB response body limit:** A typical 10-15 page FRED report rendered by react-pdf is 300-600KB. Well within limits. Only a concern if embedding many high-res images.

---

## PDF Storage

### Use: `@vercel/blob` v2.0.0 (already installed)

**Confidence:** HIGH — already in use for pitch deck storage.

Generate the PDF, upload to Blob with a stable URL, store the URL in Supabase against the founder's record. This enables:
- Web preview via `<iframe src={blobUrl} />` or `react-pdf` viewer
- Download link without regenerating
- Email with a link (avoids attachment size limits)
- Deduplication (only regenerate if report data changes)

```typescript
import { put } from '@vercel/blob'

const { url } = await put(
  `reports/${userId}/founder-journey-report.pdf`,
  buffer,
  { access: 'public', contentType: 'application/pdf' }
)
```

---

## AI Re-synthesis (FRED Narrative Generation)

### Use: Vercel AI SDK v6.0.72 + Anthropic Claude (already installed)

**Confidence:** HIGH — this is the existing pattern for all FRED AI features in this codebase.

No new libraries needed. The re-synthesis step is a structured `generateText` or `streamText` call that takes the 19 founder answers as context and produces a polished narrative. Use `@ai-sdk/anthropic` with `claude-opus-4-5` or `claude-sonnet-4-5` depending on quality/cost tradeoff for this tier.

```typescript
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

const { text } = await generateText({
  model: anthropic('claude-sonnet-4-5'),
  system: FRED_REPORT_SYSTEM_PROMPT,
  prompt: buildFounderReportPrompt(founderAnswers),
  maxTokens: 4000,
})
```

**Timeout consideration:** A 19-section synthesis with ~4000 output tokens takes 15-30 seconds. This fits within Vercel's 300s limit. If the synthesis + PDF render + upload sequence approaches 60 seconds in practice, move the whole report generation to Trigger.dev (already installed at `^4.4.1`).

---

## Background Job Orchestration (Conditional)

### If needed: `@trigger.dev/sdk` v4.4.1 (already installed)

**Confidence:** MEDIUM — not needed unless synthesis+render+email exceeds 60s in production

Trigger.dev is already in `package.json`. If the report generation pipeline (AI synthesis → PDF render → Blob upload → email) exceeds Vercel's practical timeout budget:

1. Route handler accepts request, immediately returns `{ status: 'generating', reportId }`
2. Trigger.dev task runs the full pipeline asynchronously (no time limit on Trigger infrastructure)
3. Supabase `founder_reports` table tracks status (`pending` → `ready`)
4. UI polls or uses Supabase Realtime to show completion

Do not add this complexity unless profiling shows it's needed. The synchronous path is simpler and should work.

---

## New Stripe Pricing Tier ($39/mo)

### Use: Stripe Dashboard + existing `stripe` v20.1.0 SDK (already installed)

**Confidence:** HIGH — Stripe fully supports multiple price objects per product.

**Implementation approach:**
1. Create a new Price in Stripe Dashboard (or via API): `$39/month`, same product as existing Pro
2. Add the new price ID to environment variables: `STRIPE_PRICE_GROWTH_MONTHLY`
3. Update the pricing page component to show three tiers (Free / Growth $39 / Pro $99)
4. Update checkout session creation to accept the Growth price ID
5. Update Stripe webhook handler to map the Growth subscription to the correct Supabase role/feature flags

No new library needed. The existing Stripe webhook infrastructure handles subscription lifecycle (created, updated, canceled) identically regardless of price tier.

**Naming recommendation:** "Growth" tier at $39 slots cleanly between Free and Pro. Avoid "Starter" (implies beginner) or "Basic" (implies stripped-down).

---

## Recommended Stack Summary

| Capability | Library | Version | Status | New Install? |
|---|---|---|---|---|
| PDF generation | `@react-pdf/renderer` | ^4.3.1 (→ 4.4.0) | Already installed | No |
| PDF email attachment | `resend` | ^6.9.1 | Already installed | No |
| PDF cloud storage | `@vercel/blob` | ^2.0.0 | Already installed | No |
| AI narrative synthesis | `ai` + `@ai-sdk/anthropic` | ^6.0.72 / ^3.0.37 | Already installed | No |
| Background jobs (if needed) | `@trigger.dev/sdk` | ^4.4.1 | Already installed | No |
| New Stripe tier | `stripe` | ^20.1.0 | Already installed | No |
| Font registration | `@react-pdf/renderer` Font API | — | Built-in | No |

**Net new npm installs required: 0.** Every library needed for v9.0 is already in package.json.

---

## Implementation Pattern for the Report Route

The existing `app/api/dashboard/export/route.ts` is the reference implementation. For the Founder Journey Report, replicate and extend this pattern:

```
app/api/report/generate/route.ts   — POST handler: auth check, fetch answers, run synthesis, render PDF, upload to Blob, send email, update DB
app/api/report/[reportId]/route.ts — GET handler: return report metadata + Blob URL for web preview
lib/pdf/founder-report.ts          — React.createElement-based PDF document (no JSX, follows existing pattern)
lib/pdf/styles.ts                  — Shared StyleSheet definitions (brand colors, typography)
lib/ai/report-synthesis.ts         — FRED re-synthesis prompt + generateText call
```

---

## Confidence Assessment

| Area | Confidence | Basis |
|---|---|---|
| @react-pdf/renderer works in this stack | HIGH | Existing working route handler in this codebase proves it |
| Vercel timeout limits | HIGH | Verified against official Vercel docs (April 2026) |
| Resend PDF attachment | HIGH | Official Resend API docs + community examples |
| Vercel Blob for PDF storage | HIGH | Already used for pitch decks in this app |
| Puppeteer rejection rationale | HIGH | Bundle size verified via Vercel official docs and community reports |
| Font registration (TTF only) | HIGH | Official react-pdf docs at react-pdf.org/fonts |
| Stripe multi-tier | HIGH | Official Stripe docs — standard pattern |
| Trigger.dev as fallback | MEDIUM | Library is installed, pattern is documented, but not battle-tested for this specific pipeline |

---

## What NOT to Add

| Library | Why Not |
|---|---|
| `puppeteer` / `@sparticuz/chromium` | Bundle size (~150MB), cold-start latency, complexity — zero benefit over existing react-pdf |
| `jsPDF` + `html2canvas` | Client-side only, rasterized output, no server delivery |
| `pdf-lib` | Wrong tool — for manipulation not generation; already available if needed for merging |
| `playwright` (for PDF) | Same Chromium constraints as Puppeteer; Playwright is already in devDependencies for E2E tests only |
| Any new AI SDK | Anthropic already wired via `@ai-sdk/anthropic`; adding a second SDK adds complexity with no benefit |

---

## Sources

- [Vercel Functions Limits (official, April 2026)](https://vercel.com/docs/functions/limitations)
- [@react-pdf/renderer npm registry](https://www.npmjs.com/package/@react-pdf/renderer)
- [react-pdf GitHub — renderToBuffer Next.js 15 issue (closed/resolved)](https://github.com/diegomura/react-pdf/issues/3074)
- [react-pdf compatibility docs](https://react-pdf.org/compatibility)
- [react-pdf font docs](https://react-pdf.org/fonts)
- [Vercel Puppeteer deployment guide](https://vercel.com/kb/guide/deploying-puppeteer-with-nextjs-on-vercel)
- [Vercel bundle size discussion](https://github.com/vercel/community/discussions/103)
- [Resend send with Next.js](https://resend.com/docs/send-with-nextjs)
- [Stripe manage products and prices](https://docs.stripe.com/products-prices/manage-prices)
- [JS PDF library comparison 2025 — Joyfill](https://joyfill.io/blog/comparing-open-source-pdf-libraries-2025-edition)
- [Trigger.dev Next.js guide](https://trigger.dev/docs/guides/frameworks/nextjs)
