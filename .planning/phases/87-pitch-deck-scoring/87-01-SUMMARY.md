---
phase: 87-pitch-deck-scoring
plan: 01
subsystem: deck-review
tags: [pitch-deck, scoring, ai, pdf-parse, documents, pro-tier]
dependency-graph:
  requires: [83]
  provides: [deck-scoring-api, deck-scorecard-ui, documents-integration]
  affects: [90]
tech-stack:
  added: []
  patterns: [pdf-parse-v2-api, 7-dimension-scoring, weighted-average, drag-drop-upload]
key-files:
  created:
    - types/deck-review.ts
    - lib/ai/deck-scoring.ts
    - app/api/dashboard/deck-review/route.ts
    - components/dashboard/deck-score-card.tsx
    - components/dashboard/deck-upload-review.tsx
  modified:
    - app/dashboard/documents/page.tsx (added DeckUploadReview in decks tab)
decisions:
  - id: d87-01-01
    decision: "Use existing parsePDF from lib/parsers/pdf-parser.ts (pdf-parse v2 API)"
    reason: "pdf-parse@2.4.5 uses class-based PDFParse named export, not default export"
  - id: d87-01-02
    decision: "7 dimensions with weighted scoring: Investability 20%, Market/Traction/Problem/Team 15% each, GTM/Narrative 10% each"
  - id: d87-01-03
    decision: "Results saved to deck_score_reviews table (non-blocking on failure)"
  - id: d87-01-04
    decision: "Pro+ tier gated via checkTierForRequest"
metrics:
  duration: ~8m
  completed: 2026-03-08
---

# Phase 87 Plan 01: Pitch Deck Scoring Summary

**End-to-end pitch deck upload and AI scoring pipeline with 7-dimension investor-perspective scorecard.**

## What Was Built

### Task 1: Backend (Types + AI Scoring + API)
- `types/deck-review.ts`: DeckDimension, DeckScorecard, DeckReviewRequest, DECK_DIMENSIONS const, DIMENSION_WEIGHTS
- `lib/ai/deck-scoring.ts`: Comprehensive scoring prompt with rubrics for all 7 dimensions. `scoreDeck()` calls AI, parses JSON response, validates dimensions, calculates weighted overall score
- `app/api/dashboard/deck-review/route.ts`: POST endpoint accepting PDF FormData. Uses `parsePDF` from existing parser (pdf-parse v2), validates file type/size/content, scores via AI, saves to DB, returns DeckScorecard

### Task 2: Frontend (Scorecard UI + Upload Flow + Documents Integration)
- `components/dashboard/deck-score-card.tsx`: Visual scorecard with color-coded overall score circle, top strength/biggest gap highlights, 7 dimension cards with progress bars and expandable suggestions
- `components/dashboard/deck-upload-review.tsx`: Drag-and-drop upload zone with state management (idle/uploading/analyzing/complete/error), inline scorecard display
- `app/dashboard/documents/page.tsx`: DeckUploadReview integrated in the Decks tab

## Verification Results
- `npx tsc --noEmit` passes (fixed pdf-parse v2 import)
- All files compile without errors
- Pro+ tier gating enforced on API endpoint
- Scorecard dimensions match spec (7 dimensions with weighted scoring)
