# Phase 87: Pitch Deck Scoring — Summary

## What was built

End-to-end pitch deck upload and AI scoring pipeline: PDF upload -> pdf-parse text extraction -> AI analysis on 7 investor dimensions -> structured scorecard display with scores, explanations, and improvement suggestions.

## Artifacts created

| File | Purpose |
|------|---------|
| `types/deck-review.ts` | TypeScript types: DeckScorecard, DeckDimension, DeckReviewRequest, DECK_DIMENSIONS, DIMENSION_WEIGHTS |
| `lib/ai/deck-scoring.ts` | AI scoring prompt with rubric for 7 dimensions, `scoreDeck()` function, weighted score calculation |
| `app/api/dashboard/deck-review/route.ts` | POST endpoint: accepts PDF FormData, extracts text, scores via AI, saves to DB, returns scorecard |
| `components/dashboard/deck-score-card.tsx` | Visual scorecard with overall score circle, 7 dimension cards with progress bars, expandable suggestions |
| `components/dashboard/deck-upload-review.tsx` | Upload flow with drag & drop, analyzing state, results display, and reset |
| `supabase/migrations/20260308_deck_score_reviews.sql` | Creates `deck_score_reviews` table with RLS policies |

## Artifacts modified

| File | Changes |
|------|---------|
| `app/dashboard/documents/page.tsx` | Added DeckUploadReview import and component in the Decks tab |

## 7 Scoring Dimensions

| Dimension | Weight |
|-----------|--------|
| Problem Clarity | 15% |
| Market Size & Opportunity | 15% |
| Team & Founder Fit | 15% |
| Traction & Validation | 15% |
| Go-to-Market Strategy | 10% |
| Narrative & Storytelling | 10% |
| Investability | 20% |

## Key features

- **Pro+ tier gating**: API endpoint checks tier via `checkTierForRequest(request, UserTier.PRO)`
- **PDF parsing**: Uses existing `parsePDF()` from `lib/parsers/pdf-parser.ts`
- **AI scoring**: Fred Cary persona with strict rubric (7+ = genuinely strong, most first drafts = 4-6)
- **Visual scorecard**: Color-coded scores (red/amber/green), progress bars, expandable suggestions
- **Upload UX**: Drag & drop + file picker, analyzing spinner, error handling with toast
- **DB persistence**: Results saved to `deck_score_reviews` table (non-blocking, logs errors)
- **Validation**: File type (PDF only), size (10MB max), text length (100K chars max), empty text check
