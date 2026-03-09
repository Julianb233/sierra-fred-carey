# Phase 87 Plan 01: VC Recommendations in Deck Scoring Summary

**One-liner:** Added vcWantToSee field to DeckDimension type, AI prompt, validation with fallback defaults, and blue VC recommendation panel in scorecard UI.

## What Was Done

### Task 1: Add vcWantToSee to type, prompt, and validation
- Added `vcWantToSee: string` to `DeckDimension` interface in `types/deck-review.ts`
- Updated `DECK_SCORING_PROMPT` in `lib/ai/deck-scoring.ts` to request `vcWantToSee` for each dimension
- Added instruction for AI to tailor VC recommendations to actual deck content
- Added `vcWantToSeeDefaults` fallback map with rubric-based defaults for all 7 dimensions
- Updated `validatedDimensions` mapping to extract and validate `vcWantToSee`
- **Commit:** `2f572f0`

### Task 2: Display VC recommendations in scorecard UI
- Added blue "What VCs want to see" panel in `DimensionCard` component
- Panel appears below explanation, above suggestions toggle
- Blue styling (bg-blue-50/border-blue-100) differentiates from orange brand suggestions
- Only renders when `vcWantToSee` is non-empty (backward compatible)
- **Commit:** `73508e8`

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npx tsc --noEmit`: 0 errors in target files
- `vcWantToSee` present in all 3 locations: types/, lib/ai/, components/dashboard/
- DeckDimension type enforces vcWantToSee field
- DECK_SCORING_PROMPT includes vcWantToSee in JSON schema
- DeckScoreCard renders vcWantToSee in visually distinct blue section

## Key Files

### Created
- None

### Modified
- `types/deck-review.ts` - Added vcWantToSee field to DeckDimension
- `lib/ai/deck-scoring.ts` - Updated prompt and validation with fallback defaults
- `components/dashboard/deck-score-card.tsx` - Added VC recommendation panel to dimension cards
