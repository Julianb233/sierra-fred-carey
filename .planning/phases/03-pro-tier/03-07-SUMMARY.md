---
phase: 03-pro-tier
plan: 07
subsystem: strategy-documents
tags: [strategy, ai-generation, pdf-export, templates, crud-api]

dependency_graph:
  requires: [03-05]
  provides: [strategy-document-generation, strategy-crud-api, pdf-export, strategy-ui]
  affects: []

tech_stack:
  added: []
  patterns: [template-driven-generation, sequential-section-generation, react-pdf-export]

files:
  created:
    - lib/db/migrations/027_strategy_documents.sql
    - lib/fred/strategy/types.ts
    - lib/fred/strategy/templates/executive-summary.ts
    - lib/fred/strategy/templates/market-analysis.ts
    - lib/fred/strategy/templates/30-60-90-plan.ts
    - lib/fred/strategy/templates/competitive-analysis.ts
    - lib/fred/strategy/templates/gtm-plan.ts
    - lib/fred/strategy/templates/index.ts
    - lib/fred/strategy/generator.ts
    - lib/fred/strategy/db.ts
    - lib/fred/strategy/index.ts
    - lib/documents/export.ts
    - app/api/fred/strategy/route.ts
    - app/api/fred/strategy/[id]/route.ts
    - app/api/fred/strategy/[id]/export/route.ts
    - components/strategy/document-type-selector.tsx
    - components/strategy/document-preview.tsx
    - components/strategy/generation-progress.tsx
    - components/strategy/document-list.tsx
    - components/strategy/index.ts
  modified:
    - app/dashboard/strategy/page.tsx

decisions:
  - id: sequential-section-generation
    description: "Generate sections sequentially (not parallel) so later sections build on earlier context for coherent documents"
    rationale: "Strategy documents need internal coherence; each section references the prior narrative"
  - id: react-pdf-for-export
    description: "Use @react-pdf/renderer with React.createElement() in .ts file for PDF generation"
    rationale: "Package already in dependencies; createElement avoids JSX in .ts file"
  - id: card-based-document-list
    description: "Document list uses card layout instead of table from semi-mock"
    rationale: "More visual, consistent with the rest of the dashboard UI patterns"

metrics:
  duration: 8m 9s
  completed: 2026-02-06
---

# Phase 03 Plan 07: Strategy Document Generation Summary

Complete implementation of the Strategy Document Generation feature with 5 template types, AI-powered multi-section generation using FRED's voice, full CRUD API with Pro tier gating, PDF export, and functional dashboard replacing the semi-mock.

## One-liner

Template-driven strategy document generator with 5 doc types, sequential AI section generation via generateText, @react-pdf/renderer PDF export, and full dashboard workflow.

## What Was Built

### Task 1: Strategy Module (12 files)

**Migration** (`lib/db/migrations/027_strategy_documents.sql`):
- `strategy_documents` table with UUID primary key, user_id, type, title, content, sections (JSONB), metadata (JSONB), version, timestamps
- Indexes on user_id, type, and created_at DESC

**Types** (`lib/fred/strategy/types.ts`):
- `StrategyDocType` union: 5 document types
- `STRATEGY_DOC_TYPES`, `DOC_TYPE_LABELS`, `DOC_TYPE_DESCRIPTIONS` maps
- `TemplateSection`, `StrategyTemplate`, `GeneratedSection`, `GeneratedDocument`, `StrategyInput` interfaces

**5 Templates** (30 total sections):
- Executive Summary: 7 sections, ~500 words, professional/concise tone
- Market Analysis: 6 sections, ~1500 words, analytical/data-driven tone
- 30-60-90 Day Plan: 6 sections, ~1200 words, action-oriented tone
- Competitive Analysis: 5 sections, ~1200 words, strategic/objective tone
- Go-to-Market Plan: 6 sections, ~1500 words, tactical/execution-focused tone

**Generator** (`lib/fred/strategy/generator.ts`):
- `generateDocument()`: loads template, generates sections sequentially, assembles markdown
- `generateSection()`: replaces placeholders, builds context with previous sections, calls `generateText()` with FRED persona
- Uses `openai('gpt-4o')` at temperature 0.6 for consistent quality

**Database** (`lib/fred/strategy/db.ts`):
- Full CRUD: save, list (with type filter + limit), getById, update (version bump), delete
- Supabase service client with mapDbToDocument mapper
- Ownership scoping on all operations (user_id filter)

**Export** (`lib/documents/export.ts`):
- `exportToPDF()`: generates professional PDF via `@react-pdf/renderer`
- Title page with document title, date, FRED branding
- Content pages with section headings (14pt bold) and body text (11pt, 1.5 line height)
- Uses `React.createElement()` since file is `.ts` not `.tsx`

### Task 2: API + UI + Dashboard (9 files)

**API Routes** (3 routes, all Pro-tier gated via `checkTierForRequest`):
- `POST /api/fred/strategy`: validates input, generates document, saves to DB
- `GET /api/fred/strategy`: lists documents with optional type filter and limit
- `GET /api/fred/strategy/[id]`: get single document
- `PUT /api/fred/strategy/[id]`: update document (bumps version)
- `DELETE /api/fred/strategy/[id]`: delete with ownership check
- `GET /api/fred/strategy/[id]/export`: generates and returns PDF buffer

**UI Components** (4 components):
- `DocumentTypeSelector`: 5-type grid with icons, selection ring, disabled state
- `GenerationProgress`: vertical stepper with section names, spinner on current, progress bar
- `DocumentList`: card-based layout with type badges, word count, relative time, view/export/delete actions
- `DocumentPreview`: full section rendering with metadata, PDF download, close button

**Dashboard Page** (`app/dashboard/strategy/page.tsx`):
- Replaces semi-mock that called wrong `/api/documents` endpoint
- Full workflow: type selection -> startup info form -> generation with progress -> document list -> preview -> PDF export
- Simulated section progress (4s interval) during generation
- Brand orange styling, Pro badge, error/loading states

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed maxTokens -> maxOutputTokens in generator**
- Found during: Task 1 verification
- Issue: AI SDK v6 renamed `maxTokens` to `maxOutputTokens`, causing TS error
- Fix: Changed parameter name in generator.ts
- Files modified: `lib/fred/strategy/generator.ts`
- Commit: c59db5e

**2. [Rule 1 - Bug] Fixed Buffer type incompatibility in export route**
- Found during: Task 2 verification
- Issue: `Buffer` not assignable to `BodyInit` in NextResponse constructor
- Fix: Wrapped with `new Uint8Array(pdfBuffer)` for correct type
- Files modified: `app/api/fred/strategy/[id]/export/route.ts`
- Commit: b4f07c1

## Commits

| Hash | Type | Description |
|------|------|-------------|
| c59db5e | feat | Strategy module: types, 5 templates, generator, DB, export, migration |
| b4f07c1 | feat | Strategy API endpoints, UI components, and dashboard page |

## Verification Results

- All 21 files created/modified
- TypeScript compiles with no new errors (pre-existing errors in other files unchanged)
- `checkTierForRequest` present in all 3 API route files
- `generateDocument` wired in POST route
- `exportToPDF` wired in export route
- `generateText` used in generator
- `renderToBuffer` used in export utility
- 6 template files (5 templates + index)
- Semi-mock page fully replaced with functional implementation
