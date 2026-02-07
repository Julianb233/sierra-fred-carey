# Phase 17-01 Summary: Founder Wellbeing Detection, Check-in Page, and Coaching

## Status: COMPLETE
**Completed:** 2026-02-07

## What Was Built

### Task 1: Detection Engine and Types
- **`lib/fred/types.ts`** -- Added `BurnoutSignals` interface with `detected`, `stressLevel` (0-100), `indicators`, `recommendation`, and `suggestCheckIn` fields. Added optional `burnoutSignals?: BurnoutSignals` field to `ValidatedInput` interface.
- **`lib/fred/actors/burnout-detector.ts`** -- New module exporting `detectBurnoutSignals(text: string): BurnoutSignals`. Analyzes messages across 5 indicator groups (sleep/exhaustion, overwhelm, isolation, doubt, anxiety) with word-boundary keyword matching. Each group scores 0-20, totaling 0-100. Detection threshold at 40, check-in suggestion at 60. Recommendations in Fred Cary's voice at 4 severity levels.
- **`lib/fred/actors/validate-input.ts`** -- Imported `detectBurnoutSignals` and `BurnoutSignals`. Added burnout detection call after topic detection. `burnoutSignals` included in returned `ValidatedInput`.

### Task 2: Check-in Page and API
- **`components/wellbeing/WellnessAssessment.tsx`** -- Client component with 7-question Likert scale (1-5) assessment covering energy, sleep, stress, motivation, social connection, decision fatigue, and work-life balance. Calculates 0-100 wellness score. Displays color-coded results (green 70+, yellow 40-69, red <40) with Fred-voiced recommendations. Styled with Sahara orange accent.
- **`app/dashboard/wellbeing/page.tsx`** -- Client page at `/dashboard/wellbeing`. Shows previous check-in history on mount (GET /api/wellbeing/check-in). Renders WellnessAssessment. On completion, POSTs results to API and displays returned recommendations. Includes "Talk to Fred" link to /chat.
- **`app/api/wellbeing/check-in/route.ts`** -- POST: Validates score/answers, persists to profiles.metadata (wellbeing_last_score, wellbeing_last_check_in, wellbeing_last_answers), returns Fred-voiced recommendations by score range. GET: Returns last check-in score and date.

### Task 3: Chat Integration and Alerts
- **`components/wellbeing/BurnoutAlert.tsx`** -- Client component rendering a dismissible amber gradient alert banner. Uses ShieldAlert icon from lucide-react. Shows recommendation text, optional "Take a Wellbeing Check-in" link, dismiss button. Slide-down animation on mount.
- **`app/api/fred/chat/route.ts`** -- Added wellbeing SSE event emission (`send("wellbeing", ...)`) when `validatedInput.burnoutSignals.detected` is true. Also added `wellbeing` field to non-streaming JSON response. Does NOT modify main chat pipeline.
- **`lib/hooks/use-fred-chat.ts`** -- Added `BurnoutSignals` import, `wellbeingAlert` state, `dismissWellbeingAlert` callback, and `"wellbeing"` case in SSE event switch. Both fields exported from hook return.

## Files Modified
| File | Change |
|------|--------|
| `lib/fred/types.ts` | Added `BurnoutSignals` interface and `burnoutSignals?` field on `ValidatedInput` |
| `lib/fred/actors/burnout-detector.ts` | **NEW** - Burnout signal detection module |
| `lib/fred/actors/validate-input.ts` | Import + call `detectBurnoutSignals`, include in return |
| `app/api/fred/chat/route.ts` | Wellbeing SSE event + non-streaming field |
| `lib/hooks/use-fred-chat.ts` | `wellbeingAlert` state, `dismissWellbeingAlert`, wellbeing event handler |
| `components/wellbeing/WellnessAssessment.tsx` | **NEW** - Multi-question assessment component |
| `components/wellbeing/BurnoutAlert.tsx` | **NEW** - Dismissible alert banner |
| `app/dashboard/wellbeing/page.tsx` | **NEW** - Wellbeing check-in page |
| `app/api/wellbeing/check-in/route.ts` | **NEW** - POST/GET check-in API |

## Verification
- `npx tsc --noEmit` passes with zero errors
- All success criteria met per plan
- No existing validation/chat logic modified
- All recommendations use Fred Cary's voice and philosophy
- No new npm dependencies
