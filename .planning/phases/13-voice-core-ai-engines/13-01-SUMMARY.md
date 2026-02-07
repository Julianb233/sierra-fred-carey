# Summary: 13-01 Core AI Engine Voice Unification

## What Changed

### Task 1: Voice utility + 4 structured-output engines

**Created `lib/fred/voice.ts`** -- Composable `buildFredVoicePreamble()` utility that builds context-appropriate Fred Cary persona preambles from fred-brain.ts exports. Supports `includeCredentials`, `includeInvestorExperience`, and `includePhilosophy` flags.

**Updated `lib/fred/reality-lens.ts`** (VOICE-02) -- Replaced generic "FRED (Founder's Rational Expert Decision-maker)" acronym persona with Fred Cary identity using `FRED_IDENTITY.name`, `FRED_BIO.yearsExperience`, `getExperienceStatement()`, and `getCredibilityStatement()`. All 7 calibration/scoring guidelines preserved unchanged.

**Updated `lib/fred/irs/engine.ts`** (VOICE-03) -- Replaced generic "expert VC analyst" with Fred Cary's investor credentials: personally taken 3 companies public, had 2 acquired, invested in 300+ startups through IdeaPros. All scoring guidelines and category evaluations preserved.

**Updated `lib/fred/strategy/generator.ts`** (VOICE-04) -- Replaced hardcoded "50+ years" with `FRED_BIO.yearsExperience`. Added specific credentials (companies founded, IPOs, acquisitions). Prompt structure and template.tone injection preserved.

**Updated `lib/fred/pitch/analyzers/index.ts`** (VOICE-05) -- Replaced hardcoded "50+ years" with `FRED_BIO.yearsExperience`. Added investor perspective ("taken N companies public"). All scoring guidelines and criteria evaluation preserved.

### Task 2: Chat pipeline templates

**Updated `lib/fred/actors/decide.ts`** (VOICE-01) -- Response templates now use Fred's voice:
- "recommend": References `FRED_BIO.companiesFounded` ("Here's my take, based on what I've seen across 40+ companies")
- "escalate": References `FRED_BIO.yearsExperience` ("Let me be straight with you", "This is your call")
- "clarify": Warmer mentor tone ("I want to give you a solid answer")
- "defer": Casual directness ("Let's come back to this")

**Updated `lib/fred/actors/synthesize.ts`** (VOICE-01) -- Recommendation templates now use Fred's voice:
- High score: "go for it" (confident)
- Medium score: References `FRED_BIO.companiesFounded` ("you need more data before committing")
- Low score: "I'm going to be honest with you" (Fred's honesty)
- Default: "Here's the bottom line" (direct)

## Verification

- `tsc --noEmit`: 0 errors
- `vitest run`: 23 files, 445 tests, ALL PASSING
- Zero hardcoded experience year numbers remain in modified files
- All 7 modified files import from `fred-brain.ts`
- No generic personas remain ("FRED acronym" and "expert VC analyst" removed)

## Files Changed

| File | Change |
|------|--------|
| `lib/fred/voice.ts` | NEW -- buildFredVoicePreamble utility |
| `lib/fred/reality-lens.ts` | System prompt rewritten with Fred identity |
| `lib/fred/irs/engine.ts` | System prompt rewritten with investor credentials |
| `lib/fred/strategy/generator.ts` | Hardcoded years → FRED_BIO import |
| `lib/fred/pitch/analyzers/index.ts` | Hardcoded years → FRED_BIO import |
| `lib/fred/actors/decide.ts` | Response templates use Fred's voice |
| `lib/fred/actors/synthesize.ts` | Recommendation templates use Fred's voice |
