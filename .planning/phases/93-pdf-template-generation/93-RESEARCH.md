# Phase 93: PDF Template & Background Generation - Research

**Researched:** 2026-04-08
**Domain:** @react-pdf/renderer + Trigger.dev v4 + Vercel Blob
**Confidence:** HIGH

## Summary

Two questions were investigated: font availability for Geist in @react-pdf/renderer, and the correct Trigger.dev v4 task structure for the PDF generation pipeline.

**Geist TTF:** Geist discrete-weight TTF files are NOT available in the npm `geist` package (it serves woff2 for Next.js). The Fontsource repo (`@fontsource/geist`) has WOFF/WOFF2 discrete weight files but no TTF. However, @react-pdf/renderer supports WOFF files via its underlying fontkit library — confirmed HIGH confidence. Use WOFF files from `@fontsource/geist` (weighs 100–900, discrete, latin subset). Do NOT use the variable font from `next/font`.

**Trigger.dev v4 pattern:** All existing tasks in this codebase use `@trigger.dev/sdk/v3` imports, not v4 (despite package.json listing `^4.4.1`). The installed SDK is v4.4.1 which re-exports the v3 API under the same import path for backward compatibility. Continue using `import { task, logger } from "@trigger.dev/sdk/v3"`. The task structure for PDF generation is a single sequential task (not chained subtasks) since all steps complete within the 10-minute maxDuration.

**Primary recommendation:** Use `task()` from `@trigger.dev/sdk/v3`, register Geist WOFF fonts via `Font.register()`, use `put()` from `@vercel/blob` directly (no wrapper), and call `updateReportStatus()` from Phase 91's CRUD layer.

---

## Q1: Geist Font for @react-pdf/renderer

### Verdict: Use WOFF from @fontsource/geist (confidence: HIGH)

**What's available:**
- `geist` npm package — serves Next.js-optimized files only, no extractable font files for direct path use
- `@fontsource/geist-sans` — provides WOFF + WOFF2 per discrete weight (100–900), latin/cyrillic subsets
- `@react-pdf/renderer` supports WOFF via fontkit (confirmed in react-pdf.org/fonts and underlying @react-pdf/fontkit)
- Variable fonts (from `next/font/google` Geist) **do not work** in react-pdf — PDF 2.0 spec does not support OpenType variable fonts

**Font registration pattern:**
```typescript
// Source: https://react-pdf.org/fonts
import { Font } from "@react-pdf/renderer";

// Register discrete weights — install @fontsource/geist-sans first
Font.register({
  family: "Geist",
  fonts: [
    {
      src: require("@fontsource/geist-sans/files/geist-latin-400-normal.woff"),
      fontWeight: 400,
    },
    {
      src: require("@fontsource/geist-sans/files/geist-latin-600-normal.woff"),
      fontWeight: 600,
    },
    {
      src: require("@fontsource/geist-sans/files/geist-latin-700-normal.woff"),
      fontWeight: 700,
    },
  ],
});
```

**Weights to register for the report:** 400 (body), 600 (subheadings), 700 (headings). Three files is sufficient.

**Install:**
```bash
npm install @fontsource/geist-sans
```

**WOFF file paths inside @fontsource/geist-sans:**
```
node_modules/@fontsource/geist-sans/files/geist-latin-{weight}-normal.woff
```
where `{weight}` is 100, 200, 300, 400, 500, 600, 700, 800, 900.

**Gotcha:** Font.register must be called at module level (outside the component/render function), before any PDF rendering occurs. Calling it inside `run()` may cause font-not-found errors on first render.

---

## Q2: Trigger.dev Task Structure

### Verdict: Single `task()` with sequential steps (confidence: HIGH)

**Codebase pattern:** All 4 existing tasks use `import { schedules, logger } from "@trigger.dev/sdk/v3"`. This project uses `@trigger.dev/sdk` v4.4.1 which still exports the v3 API under the `/v3` path. Do not change the import path.

**Task for PDF generation uses `task()` (not `schedules.task()`)** — it is triggered on demand from an API route, not on a schedule.

**Pattern for this phase:**

```typescript
// trigger/generate-founder-report-pdf.ts
import { task, logger } from "@trigger.dev/sdk/v3";
import React from "react";
import { renderToBuffer, Font } from "@react-pdf/renderer";
import { put } from "@vercel/blob";
import { updateReportStatus } from "@/lib/db/founder-reports";

// Font registration at module level — required
Font.register({ family: "Geist", fonts: [...] });

export const generateFounderReportPdf = task({
  id: "generate-founder-report-pdf",
  maxDuration: 120, // 2 minutes is ample for PDF render + upload
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: { reportId: string; userId: string; version: number; reportData: ReportData }) => {
    const { reportId, userId, version, reportData } = payload;

    // Step 1: Mark as generating
    await updateReportStatus(reportId, { status: "generating" });

    // Step 2: Build PDF document with React.createElement (no JSX in .ts files)
    const doc = buildPdfDocument(reportData); // returns React.createElement(Document, ...)
    const buffer = await renderToBuffer(doc);
    logger.log("PDF rendered", { bytes: buffer.byteLength });

    // Step 3: Upload to Vercel Blob with versioned path
    const blobPath = `founder-reports/${userId}/v${version}-report.pdf`;
    const blob = await put(blobPath, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/pdf",
    });
    logger.log("PDF uploaded", { url: blob.url });

    // Step 4: Update DB record
    await updateReportStatus(reportId, {
      status: "complete",
      pdfBlobUrl: blob.url,
      pdfSizeBytes: buffer.byteLength,
      generationMs: /* track elapsed */ 0,
    });

    // Step 5: Trigger email (fire-and-forget via separate task or Resend directly)
    // Per prior decision: do NOT attach PDF — send Blob URL link
    // Can call sendReportEmail.trigger({ reportId, pdfUrl: blob.url, userId })
    // OR call Resend directly here

    return { pdfUrl: blob.url, sizeBytes: buffer.byteLength };
  },
});
```

**Triggering from API route:**
```typescript
// app/api/reports/[reportId]/generate-pdf/route.ts
import { generateFounderReportPdf } from "@/trigger/generate-founder-report-pdf";

await generateFounderReportPdf.trigger({
  reportId,
  userId,
  version,
  reportData,
});
// Return 202 immediately — task runs in background
```

**Key decisions:**
- Single task, sequential steps — no subtask chaining needed here; all steps are fast
- `triggerAndWait()` is NOT used — the API route returns 202 and the client polls status
- `put()` accepts `Buffer` directly — no need to convert to `File` object
- Blob path pattern: `founder-reports/{userId}/v{version}-report.pdf` — each version is a new file, satisfying RDEL-04 (no overwrites)

---

## Existing Code Patterns — Critical Notes

### React.createElement (not JSX)

The existing export route (`app/api/dashboard/export/route.ts`) uses `React.createElement` throughout — not JSX. This is intentional because the file is `.ts` not `.tsx`. The new Trigger task will also be `.ts`, so follow the same pattern: `React.createElement(Page, { size: "A4", style: styles.page }, ...)`.

### Vercel Blob direct usage

`lib/storage/upload.ts` wraps `put()` for pitch-deck uploads but validates `File` objects. For the PDF task, call `put()` from `@vercel/blob` directly — `Buffer` is accepted natively. Do NOT try to convert the buffer to a `File`.

### DB update function is ready

`lib/db/founder-reports.ts` from Phase 91 already has:
- `updateReportStatus()` — updates status, pdfBlobUrl, pdfSizeBytes, generationMs
- `getNextVersion()` — call before creating the task to pass correct version in payload
- `createReport()` — creates the DB row first with `status: "pending"`, then trigger the task

**Correct sequence in API route:**
1. `getNextVersion(userId)` → `version`
2. `createReport({ userId, version, reportData, stepSnapshot, status: "pending" })` → `{ id: reportId }`
3. `generateFounderReportPdf.trigger({ reportId, userId, version, reportData })`
4. Return `{ reportId, status: "pending" }` with 202

---

## Common Pitfalls

### Pitfall 1: Variable font silently fails
@react-pdf/renderer will silently fall back to Courier if the registered font is a variable font OTF/WOFF2. No error is thrown. **Prevention:** Use discrete-weight WOFF files. Verify by checking the rendered PDF text is not in Courier.

### Pitfall 2: Font.register inside run() function
If `Font.register()` is called inside the task's `run()` function, it may not be ready on first render due to how Trigger.dev bundles modules. **Prevention:** Call `Font.register()` at module top level, outside all functions.

### Pitfall 3: Trigger.dev payload size limit
Task payloads have a size limit (~512KB compressed). `ReportData` with sections + synthesized text should be well under this, but do NOT pass the full `stepSnapshot` raw data in the payload if it's large. Pass `reportId` and re-fetch from DB inside the task if needed.

### Pitfall 4: BLOB_READ_WRITE_TOKEN in Trigger.dev environment
Vercel Blob `put()` requires `BLOB_READ_WRITE_TOKEN`. This env var must be explicitly added to the Trigger.dev project environment variables (Trigger.dev cloud does NOT inherit Vercel env vars automatically). Check trigger.dev dashboard → project → environment variables.

### Pitfall 5: maxDuration
Current global default in `trigger.config.ts` is 600s (10 minutes). PDF render + upload should complete in <30 seconds. Set task-level `maxDuration: 120` to fail fast on hangs rather than burning 10 minutes.

---

## Sources

### Primary (HIGH confidence)
- react-pdf.org/fonts — Font.register API, supported formats (TTF + WOFF confirmed)
- Existing codebase `app/api/dashboard/export/route.ts` — React.createElement pattern, renderToBuffer
- Existing codebase `trigger/feedback-clustering.ts` — task structure pattern
- Existing codebase `lib/db/founder-reports.ts` — updateReportStatus, createReport CRUD
- `@trigger.dev/sdk` package.json v4.4.1, imports use `/v3` path throughout codebase

### Secondary (MEDIUM confidence)
- github.com/fontsource/font-files — WOFF discrete weights confirmed for geist, no TTF in this repo
- WebSearch + react-pdf docs: WOFF support confirmed via fontkit underlying library
- trigger.dev/docs + github.com/triggerdotdev — triggerAndWait pattern, task() API

### Tertiary (LOW confidence)
- WebSearch: @fontsource/geist-sans file path pattern `geist-latin-{weight}-normal.woff` — verify after install

---

## Metadata

**Confidence breakdown:**
- Font approach (WOFF from @fontsource/geist-sans): HIGH — supported format confirmed, discrete weights confirmed
- Trigger.dev task structure: HIGH — matches all 4 existing tasks in codebase
- Blob upload with Buffer: HIGH — @vercel/blob put() accepts Buffer natively
- WOFF file paths in @fontsource/geist-sans: MEDIUM — pattern confirmed via fontsource repo structure, verify after npm install

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable libraries)
