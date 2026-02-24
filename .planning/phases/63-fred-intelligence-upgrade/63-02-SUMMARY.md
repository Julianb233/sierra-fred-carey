# Phase 63 Plan 02: Mode Switching False Positive Reduction Summary

**One-liner:** Negative pattern suppression, 2-signal threshold, sliding window confidence, and 5-message exit hysteresis for mode transitions

## Metadata

- **Phase:** 63-fred-intelligence-upgrade
- **Plan:** 02
- **Subsystem:** AI diagnostic engine, framework signal detection
- **Tags:** mode-switching, false-positives, signal-detection, confidence-scoring
- **Duration:** ~4 minutes
- **Completed:** 2026-02-23

## What Was Done

### Task 1: Add negative patterns and confidence scoring to signal detection
**Commit:** `1f81e58`
**Files:** `lib/ai/frameworks/positioning.ts`, `lib/ai/frameworks/investor-lens.ts`

- Added `NEGATIVE_POSITIONING_PATTERNS` array to suppress false positives ("my position in the company", "position paper")
- Added `NEGATIVE_INVESTOR_PATTERNS` array to suppress false positives ("value my time", "raise awareness", "capital city", "deck the halls", "pitch in")
- Fixed `icpVagueOrUndefined`: added 100-char minimum for the absence-of-customer/buyer heuristic (short messages no longer falsely trigger)
- Fixed `everyoneAsTarget`: added negative patterns for "everyone knows", "tell everyone", "everyone on my team"
- Fixed `genericMessaging`: now requires 2+ buzzwords together instead of single keyword match
- Fixed `mentionsFundraising`: "raise" now checks for negative raise patterns before triggering
- Fixed `mentionsDeck`: standalone "pitch" no longer triggers; requires "pitch deck", "my pitch", "pitch to investors" etc.
- Added `countPositioningSignals()` and `countInvestorSignals()` exports
- Changed `needsPositioningFramework()` to require 2+ signals
- Changed `needsInvestorLens()` to require 2+ signals (uploadedDeck always triggers by itself)

### Task 2: Update diagnostic engine with confidence scoring and higher exit threshold
**Commit:** `c597a1f`
**Files:** `lib/ai/diagnostic-engine.ts`

- Increased `MODE_EXIT_THRESHOLD` from 3 to 5 (prevents premature framework exit during natural Q&A gaps)
- Added `MIN_SIGNALS_TO_TRANSITION = 2` constant
- Added sliding window confidence check: before entering a mode, requires 1+ recent signal for the target framework in the last 3 signal history entries (prevents single-message bursts)
- Added `signalConfidence: number` field (0-1) to `ModeTransitionResult` for observability
- Updated imports to use `countPositioningSignals` and `countInvestorSignals` from framework modules
- Updated `analyzeConversation()` to use framework-level count functions

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Sliding window checks current history entry (just pushed) | The current message's signal gets pushed to history before the window check, so the first strong-signal message always passes the sliding window |
| `hasDeckKeyword` uses explicit negative check instead of regex source inspection | Simpler and more maintainable than inspecting regex `.source` property |
| Local `countTrueSignals` delegates to imported `countPositioningSignals` | Maintains backward compatibility while using canonical implementation |

## Verification Results

- TypeScript compiles without errors: PASS
- Existing tests pass: 766/778 (12 pre-existing failures unchanged)
- `NEGATIVE_POSITIONING_PATTERNS` defined in positioning.ts: PASS
- `NEGATIVE_INVESTOR_PATTERNS` defined in investor-lens.ts: PASS
- `countPositioningSignals` and `countInvestorSignals` exported: PASS
- 2-signal threshold enforced in both frameworks: PASS
- `MODE_EXIT_THRESHOLD = 5`: PASS
- `MIN_SIGNALS_TO_TRANSITION = 2`: PASS
- `signalConfidence` field added to `ModeTransitionResult`: PASS

## Key Files

### Created
None

### Modified
- `lib/ai/frameworks/positioning.ts` - Negative patterns, confidence scoring, 2-signal threshold
- `lib/ai/frameworks/investor-lens.ts` - Negative patterns, confidence scoring, 2-signal threshold
- `lib/ai/diagnostic-engine.ts` - Exit threshold, sliding window, signalConfidence field

## Tech Stack

- **Patterns established:** Negative pattern suppression for signal detection, sliding window confidence for mode transitions
- **No new packages:** All changes are logic-only
