---
phase: 03-pro-tier
plan: 06
subsystem: pitch-review
tags: [pitch-deck, ai-analysis, slide-classifier, generateObject, zod, supabase, pro-tier]

dependency_graph:
  requires:
    - 03-01 (PDF pipeline for document chunks)
    - 03-02 (IRS patterns: engine, db, types, barrel)
    - 02-04 (Tier gating: checkTierForRequest)
  provides:
    - Complete pitch deck review engine (lib/fred/pitch/)
    - Pitch review API (POST/GET /api/fred/pitch-review)
    - Pitch review database table (pitch_reviews)
    - Functional dashboard page (/dashboard/pitch-deck)
    - Reusable UI components (ReviewSummary, DeckOverview, SlideAnalysisPanel)
  affects:
    - Any future pitch deck features (comparison, versioning)
    - Dashboard navigation (pitch-deck entry now functional)

tech_stack:
  added: []
  patterns:
    - Batch AI classification with single generateObject call
    - Per-slide analysis with type-specific criteria prompts
    - Deterministic structure scoring (no AI call)
    - Weighted overall scoring (40% structure + 60% content)

key_files:
  created:
    - lib/db/migrations/026_pitch_reviews.sql
    - lib/fred/pitch/types.ts
    - lib/fred/pitch/slide-classifier.ts
    - lib/fred/pitch/analyzers/index.ts
    - lib/fred/pitch/review-engine.ts
    - lib/fred/pitch/db.ts
    - lib/fred/pitch/index.ts
    - app/api/fred/pitch-review/route.ts
    - components/pitch/review-summary.tsx
    - components/pitch/deck-overview.tsx
    - components/pitch/slide-analysis-panel.tsx
    - components/pitch/index.ts
  modified:
    - app/dashboard/pitch-deck/page.tsx (replaced static mock)

decisions:
  - id: batch-classification
    decision: Classify all slides in one generateObject call instead of N separate calls
    rationale: Reduces API calls from N to 1, faster and cheaper for decks with many slides
  - id: deterministic-structure-score
    decision: Structure score is computed deterministically (not AI-generated)
    rationale: Reproducibility and speed; missing required slides is a factual check, not opinion
  - id: weighted-scoring
    decision: Overall = 40% structure + 60% content
    rationale: Content quality matters more than having the right structure, but structure still significant

metrics:
  duration: ~5 minutes
  completed: 2026-02-06
---

# Phase 03 Plan 06: Pitch Deck Review - Full Implementation Summary

**One-liner:** AI-powered slide-by-slide pitch review with batch classification, type-specific analysis, deterministic structure scoring, and interactive dashboard replacing static mock.

## What Was Built

### Pitch Review Engine (lib/fred/pitch/)

Mirrors the lib/fred/irs/ module structure exactly:

1. **types.ts** - 12 slide types (title, problem, solution, market, product, business_model, traction, competition, team, financials, ask, appendix) plus 'unknown'. Includes REQUIRED_SLIDES (7 types investors expect), SLIDE_LABELS, SLIDE_DESCRIPTIONS. Interfaces: SlideClassification, SlideAnalysis, PitchReview, PitchReviewInput, DeckStructure.

2. **slide-classifier.ts** - Two functions: `classifySlide` (single) and `classifyDeck` (batch). Batch call sends all page contents in one generateObject request with Zod schema. Uses temperature 0.2 for accuracy. System prompt includes all 12 types with position hints.

3. **analyzers/index.ts** - Dispatcher pattern with SLIDE_CRITERIA record (per-type evaluation criteria). `analyzeSlide` function uses generateObject with type-specific prompts in Fred Cary's voice. Temperature 0.3. Returns score 0-100, feedback, strengths, suggestions.

4. **review-engine.ts** - Main orchestrator `reviewPitchDeck`:
   - Batch classify all slides
   - Parallel analyze each slide (Promise.all)
   - Deterministic structure score (-12 per missing required slide, -10 if >20 or <8 slides)
   - Content score = average of slide scores
   - Overall = 40% structure + 60% content
   - Identifies missing sections, compiles top strengths/improvements

5. **db.ts** - CRUD for pitch_reviews table: savePitchReview, getPitchReview, getPitchReviews, getPitchReviewByDocument. Same Supabase client pattern as IRS db.ts.

6. **index.ts** - Barrel re-exports all public APIs.

### Database Migration

**026_pitch_reviews.sql** - Table with overall_score, structure_score, content_score, slides JSONB, missing_sections TEXT[], strengths TEXT[], improvements TEXT[]. Indexes on user_id, document_id, created_at.

### API Endpoints

**POST /api/fred/pitch-review** - Pro-tier gated. Accepts { documentId }. Loads document chunks from PDF pipeline, builds pages array, runs reviewPitchDeck, saves result, returns full review.

**GET /api/fred/pitch-review** - Pro-tier gated. Optional documentId query param returns specific document review. Otherwise lists all reviews for user.

### UI Components (components/pitch/)

- **ReviewSummary** - ScoreGauge (reused from IRS), structure/content progress bars, strengths list (green check icons), improvements list (orange arrow icons), missing sections badges (red outline).
- **DeckOverview** - Responsive grid of slide cards with color-coded borders (red/yellow/green by score), click-to-select with ring highlight, page numbers, type badges, truncated feedback.
- **SlideAnalysisPanel** - Detailed per-slide view with confidence badge, large score display, feedback paragraph, strengths (CheckCircle2), suggestions (Lightbulb), close button.

### Dashboard Page

**/dashboard/pitch-deck** - Replaced entire static mock. Functional flow: load documents -> select pitch deck -> check for existing review -> trigger AI review -> display results in two-column layout (summary + grid left, analysis panel right). Handles loading, reviewing, error states. Pro badge in header.

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Batch classification (single AI call for all slides) | Reduces N API calls to 1 for efficiency |
| Deterministic structure scoring | Reproducible, fast, factual (missing slide = known fact) |
| 40/60 structure/content weighting | Content quality > deck structure, but structure still matters |
| Parallel slide analysis with Promise.all | Maximizes speed for multi-slide decks |

## Commits

| Hash | Message |
|------|---------|
| 26806c6 | feat(03-06): pitch review engine - types, classifier, analyzers, engine, DB, migration |
| 6002925 | feat(03-06): pitch review API, UI components, and dashboard page |

## Success Criteria Verification

- [x] lib/fred/pitch/ module exists with types, classifier, analyzers, engine, db, barrel
- [x] Slide classifier identifies 12 slide types using generateObject + Zod
- [x] Per-slide analysis produces score 0-100, feedback, strengths, suggestions
- [x] Overall scoring: 40% structure + 60% content
- [x] Missing sections identified by comparing against 7 REQUIRED_SLIDES
- [x] POST /api/fred/pitch-review is Pro-tier gated, accepts documentId
- [x] GET /api/fred/pitch-review returns stored reviews
- [x] Database: pitch_reviews table with slides JSONB, scores, strengths, improvements
- [x] Dashboard at /dashboard/pitch-deck replaces static mock
- [x] UI: slide-by-slide navigation with deck overview grid and analysis panel
- [x] TypeScript compiles without errors (in pitch module)
