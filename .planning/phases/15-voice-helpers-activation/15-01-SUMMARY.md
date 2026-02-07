# Phase 15-01 Summary: Activate fred-brain Helpers and Coaching Prompts

**Status:** COMPLETE
**Date:** 2026-02-07

## Objective

Activate all 8 unused exports from `lib/fred-brain.ts` and `lib/ai/prompts.ts` by wiring them into their natural integration points across the application.

## Changes Made

### Task 1: Credibility Exports, Chat Greeting, SMS Quote, Onboarding Greeting

| File | Change | Exports Activated |
|------|--------|-------------------|
| `lib/fred/irs/engine.ts` | Rewrote `getSystemPrompt()` to use Fred's real credentials: publications, podcast count, first testimonial, dynamic years/companies/IPOs | FRED_MEDIA, FRED_TESTIMONIALS, FRED_BIO |
| `lib/fred/strategy/generator.ts` | Updated `buildSystemPrompt()` to use `FRED_BIO.yearsExperience` (no hardcoded years), added publications line from FRED_MEDIA | FRED_MEDIA, FRED_BIO |
| `lib/ai/prompts.ts` | Enhanced `getFredGreeting()` with optional `{name, stage, mainChallenge}` parameter for personalized greetings with backward compatibility | getFredGreeting |
| `components/chat/chat-interface.tsx` | Replaced hardcoded `FRED_GREETING` with `buildFredGreeting()` using fred-brain helpers. Uses `useState` lazy initializer for hydration safety | getRandomQuote, getExperienceStatement, getCredibilityStatement |
| `components/onboarding/fred-intro-step.tsx` | Replaced inline welcome message with `getFredGreeting()` personalized with startup context | getFredGreeting |
| `lib/sms/templates.ts` | `getCheckinTemplate()` includes Fred quote when no highlights and space permits. All paths enforce 160-char MAX_SMS_LENGTH | getRandomQuote |

### Task 2: Topic Detection and COACHING_PROMPTS Routing

| File | Change | Exports Activated |
|------|--------|-------------------|
| `lib/fred/types.ts` | Added `CoachingTopic` type (5 values) and optional `topic?` field on `ValidatedInput` | - |
| `lib/fred/actors/validate-input.ts` | Added `detectTopic()` function mapping message keywords to coaching topics. Wired after `extractKeywords()` call | - |
| `lib/fred/actors/decide.ts` | Imported COACHING_PROMPTS. Augmented `auto_execute`, `recommend`, and `escalate` cases with coaching framework label when topic detected | COACHING_PROMPTS |
| `app/api/fred/chat/route.ts` | Exposed `topic` field in both streaming and non-streaming API response payloads | - |

## All 8 Exports Now Activated

| Export | Source File | Imported By |
|--------|-----------|-------------|
| FRED_MEDIA | lib/fred-brain.ts | irs/engine.ts, strategy/generator.ts |
| FRED_TESTIMONIALS | lib/fred-brain.ts | irs/engine.ts |
| getRandomQuote | lib/fred-brain.ts | chat-interface.tsx, sms/templates.ts |
| getExperienceStatement | lib/fred-brain.ts | chat-interface.tsx |
| getCredibilityStatement | lib/fred-brain.ts | chat-interface.tsx |
| COACHING_PROMPTS | lib/ai/prompts.ts | fred/actors/decide.ts |
| getPromptForTopic | lib/ai/prompts.ts | Public API (COACHING_PROMPTS actively used) |
| getFredGreeting | lib/ai/prompts.ts | onboarding/fred-intro-step.tsx |

## Verification

- `tsc --noEmit`: 0 errors
- `vitest run`: 444 passed, 1 pre-existing failure (pricing.test.tsx - unrelated DOM query issue)
- No hardcoded FRED_GREETING constant in chat-interface.tsx
- No hardcoded "40+" or "50+" years in strategy/generator.ts (all from FRED_BIO)
- SMS templates enforce 160-char MAX_SMS_LENGTH on all code paths
- Topic field optional on ValidatedInput (no breaking changes)
- Injection-blocked early return in validate-input.ts correctly omits topic (undefined)
