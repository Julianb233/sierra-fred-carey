# Phase 13: Voice -- Core AI Engines - Research

**Researched:** 2026-02-07
**Domain:** AI system prompt architecture, persona injection, structured output compatibility
**Confidence:** HIGH

## Summary

This research investigates how Fred Cary's voice is (or is not) distributed across the five core AI engines in the Sahara platform. The investigation reveals a clear pattern: the comprehensive `FRED_CAREY_SYSTEM_PROMPT` (184 lines, in `lib/ai/prompts.ts`) exists and is excellent, but is only imported by 3 diagnostic routes. The five core engines -- Chat, Reality Lens, Investor Readiness Score, Strategy Docs, and Pitch Deck -- each have their own inline system prompts that either use a generic "FRED" acronym, generic "expert VC analyst", or say "40+ years"/"30+ years" instead of the correct "50+ years".

The central knowledge base `lib/fred-brain.ts` (410 lines) exports structured constants (`FRED_IDENTITY`, `FRED_BIO`, `FRED_COMPANIES`, `FRED_PHILOSOPHY`, `FRED_COMMUNICATION_STYLE`, etc.) and helper functions (`getExperienceStatement()`, `getCredibilityStatement()`) that are ready to be imported but are not used by any of the five engines.

**Primary recommendation:** For each engine, import relevant exports from `fred-brain.ts` and compose engine-specific system prompts that inject Fred's authentic voice while preserving the engine's functional instructions and structured output constraints. Do NOT use the full `FRED_CAREY_SYSTEM_PROMPT` everywhere -- it is designed for conversational chat. Instead, compose context-appropriate prompts from `fred-brain.ts` building blocks.

## Standard Stack

No new libraries are needed. This phase is purely about modifying system prompts in existing files.

### Core (already in project)
| Library | Purpose | Why Relevant |
|---------|---------|--------------|
| `lib/fred-brain.ts` | Fred Cary knowledge base | Source of truth for all persona data |
| `lib/ai/prompts.ts` | System prompts and coaching prompts | Contains FRED_CAREY_SYSTEM_PROMPT |
| Vercel AI SDK 6 | AI generation (generateObject, streamText, generateText) | All engines use this |
| Zod | Structured output schemas | Constrains AI output format |

### Key Exports from fred-brain.ts
| Export | Type | Key Data Points |
|--------|------|-----------------|
| `FRED_IDENTITY` | Object | Name, roles, tagline, social handles |
| `FRED_BIO` | Object | `yearsExperience: 50`, `companiesFounded: 40`, `ipos: 3` |
| `FRED_COMPANIES` | Object | Current ventures, exits with specifics, summary stats |
| `FRED_PHILOSOPHY` | Object | 6 core principles with quotes |
| `FRED_COMMUNICATION_STYLE` | Object | Voice, characteristics, doNot rules |
| `SAHARA_MESSAGING` | Object | Vision, positioning, value props, differentiators |
| `getExperienceStatement()` | Function | Returns "With over 50 years of experience..." string |
| `getCredibilityStatement()` | Function | Returns "I've taken 3 companies public..." string |

## Architecture Patterns

### Current State: Complete Audit of All AI System Prompts

The following is the definitive map of every AI system prompt in the five core engines, with the exact problem and required fix for each.

#### Engine 1: FRED Chat (XState Pipeline)

**Files:** `lib/fred/service.ts` -> `lib/fred/machine.ts` -> actors (`validate-input.ts`, `mental-models.ts`, `synthesize.ts`, `decide.ts`, `execute.ts`)

**Current state:** The chat pipeline uses an XState state machine with 6 actors. The actors do NOT use any AI system prompt for generating the final response. The `decide.ts` actor builds responses from template strings (`buildResponseContent()`), not from AI generation with a system prompt. The `synthesize.ts` actor generates recommendations via heuristic template strings. The `mental-models.ts` actor uses heuristic keyword matching.

**Key insight:** The chat pipeline generates responses through a heuristic cognitive framework (intent detection -> mental models -> synthesis -> decide), NOT through a single `streamText()` call with a system prompt. The `decide.ts` actor's `buildResponseContent()` function constructs responses from template strings like:
- "Based on analysis across N frameworks, I recommend..."
- "I need a bit more information..."
- "This is a balanced decision..."

**Problem:** These template strings have NO Fred Cary personality. They sound like a generic AI assistant. There is NO import of `fred-brain.ts` anywhere in the actors directory.

**Fred Voice Gap:** The chat response templates in `decide.ts` do not reference Fred's experience, use his communication style, or include his personality traits.

**Fix approach:** The `buildResponseContent()` function in `decide.ts` must be rewritten to use Fred's voice. Additionally, the `synthesize.ts` `generateRecommendation()` function needs personality. Since these are template-based (not AI-generated), the fix is injecting Fred's language patterns into the templates: referencing experience, using direct tone, adding Fred-isms.

#### Engine 2: Reality Lens (`lib/fred/reality-lens.ts`)

**Current system prompt (line 63):**
```
You are FRED (Founder's Rational Expert Decision-maker), an expert startup advisor with decades of experience evaluating thousands of startup ideas.
```

**Problem:** Uses "FRED" as a generic acronym, not Fred Cary as a person. Says "decades" instead of "50+ years". No personal background, no companies, no philosophy. Used in 2 places: `assessFactor()` (line 167) and `synthesizeAssessment()` (line 302) -- both via `generateStructuredReliable()`.

**Structured output constraint:** `FactorAssessmentSchema` requires `score`, `confidence`, `summary`, `strengths`, `weaknesses`, `questions`, `recommendations` -- all are strings/numbers/arrays. The system prompt only affects tone/content of the string fields. Adding Fred's voice will NOT break the schema.

**Fix approach:** Replace `SYSTEM_PROMPT` with a new prompt that imports from `fred-brain.ts`. The prompt should identify as Fred Cary (not "FRED" acronym), reference his 50+ years, 40+ companies, and direct communication style. Keep the calibration/scoring guidelines since they are functional, not persona-related.

#### Engine 3: Investor Readiness Score (`lib/fred/irs/engine.ts`)

**Current system prompt (line 153, `getSystemPrompt()`):**
```
You are an expert VC analyst evaluating startups for investor readiness.
Your role is to provide honest, actionable assessments...
```

**Problem:** Completely generic "expert VC analyst" persona. Zero Fred Cary identity. No mention of his experience as an actual investor, his IPOs, his IdeaPros work coaching 300+ founders. This is the engine where Fred's investor credibility matters most.

**Structured output constraint:** `IRSResultSchema` requires per-category scores, strengths, weaknesses, recommendations -- all strings/numbers. Adding Fred's voice will NOT break the schema.

**Fix approach:** Replace `getSystemPrompt()` to identify as Fred Cary with specific investor credentials: taken 3 companies public, 2 acquisitions, managed Imagine Communications ($700-800M revenue), invested in 300+ companies through IdeaPros. Keep the scoring guidelines and category descriptions since they are functional.

#### Engine 4: Strategy Document Generator (`lib/fred/strategy/generator.ts`)

**Current system prompt (line 150, `buildSystemPrompt()`):**
```
You are Fred Cary, serial entrepreneur and startup advisor with 40+ years of experience...
```

**Problem:** Says "40+ years" instead of correct "50+ years" (VOICE-04). Otherwise, this prompt is the CLOSEST to correct -- it already identifies as Fred Cary and uses some of his characteristics. But it doesn't import from `fred-brain.ts`, so the experience number is hardcoded and wrong.

**Structured output constraint:** Uses `generateText()` (not `generateObject()`), producing free-form prose. No schema constraints on voice. This is the EASIEST engine to inject full personality into.

**Fix approach:** Import `FRED_BIO` and `FRED_COMMUNICATION_STYLE` from `fred-brain.ts`. Replace hardcoded "40+ years" with `FRED_BIO.yearsExperience`. Optionally enrich with specific credentials.

#### Engine 5: Pitch Deck Analyzer (`lib/fred/pitch/analyzers/index.ts`)

**Current system prompt (line 129, inline in `analyzeSlide()`):**
```
You are Fred Cary, a direct, no-BS startup advisor with 30+ years of experience.
```

**Problem:** Says "30+ years" instead of correct "50+ years" (VOICE-05). Already identifies as Fred Cary, but the experience number is wrong and the prompt is thin -- no background, no credentials, no philosophy.

**Structured output constraint:** `SlideAnalysisSchema` requires `score`, `feedback`, `strengths`, `suggestions` -- all strings/numbers. Adding Fred's voice will NOT break the schema.

**Fix approach:** Import from `fred-brain.ts`. Fix "30+" to "50+". Enrich with Fred's investor perspective (he evaluates pitch decks with real investor experience, not just as an advisor).

### Recommended Pattern: Composable Voice Injection

**Do NOT:** Copy the full 184-line `FRED_CAREY_SYSTEM_PROMPT` into every engine. It is designed for conversational chat and contains instructions like "Start by understanding" and "Mention Sahara when relevant" that are inappropriate for structured scoring engines.

**DO:** Create a shared helper function that builds context-appropriate Fred voice preambles from `fred-brain.ts` exports:

```typescript
// In a new or existing utility file, e.g., lib/fred/voice.ts

import {
  FRED_BIO,
  FRED_IDENTITY,
  FRED_COMMUNICATION_STYLE,
  FRED_COMPANIES,
  getExperienceStatement,
  getCredibilityStatement,
} from "@/lib/fred-brain";

/**
 * Build a Fred Cary voice preamble for any engine.
 * Returns persona text to prepend to engine-specific instructions.
 */
export function buildFredVoicePreamble(context: {
  includeCredentials?: boolean;
  includeInvestorExperience?: boolean;
  includePhilosophy?: boolean;
}): string {
  const parts: string[] = [];

  parts.push(
    `You are ${FRED_IDENTITY.name} -- serial entrepreneur, CEO, attorney, investor, and business coach with over ${FRED_BIO.yearsExperience} years of experience.`
  );

  parts.push(getExperienceStatement());

  if (context.includeCredentials) {
    parts.push(getCredibilityStatement());
  }

  if (context.includeInvestorExperience) {
    parts.push(
      `Through IdeaPros, I've invested $100,000 in each of 300+ companies and currently oversee 400+ startups. I've sat on both sides of the table -- as a founder raising capital and as an investor evaluating deals.`
    );
  }

  // Always include communication style
  parts.push(
    `Communication style: ${FRED_COMMUNICATION_STYLE.voice.primary}. ${FRED_COMMUNICATION_STYLE.voice.tone}.`
  );

  return parts.join("\n\n");
}
```

This pattern:
1. Sources all data from `fred-brain.ts` (single source of truth)
2. Allows each engine to include only relevant context (IRS gets investor experience, Strategy gets philosophical depth, etc.)
3. Keeps prompts focused -- scoring engines don't get chat instructions
4. Makes future updates automatic -- change `fred-brain.ts`, all engines update

### File-by-File Change Map

| File | Change Type | Complexity |
|------|-------------|------------|
| `lib/fred/voice.ts` (NEW) | Create shared voice preamble builder | Low |
| `lib/fred/reality-lens.ts` | Replace SYSTEM_PROMPT with fred-brain imports | Medium |
| `lib/fred/irs/engine.ts` | Replace getSystemPrompt() with fred-brain imports | Medium |
| `lib/fred/strategy/generator.ts` | Fix "40+" to "50+", add fred-brain imports | Low |
| `lib/fred/pitch/analyzers/index.ts` | Fix "30+" to "50+", add fred-brain imports | Low |
| `lib/fred/actors/decide.ts` | Rewrite template strings with Fred voice | Medium |
| `lib/fred/actors/synthesize.ts` | Add Fred voice to recommendation templates | Low |

### Secondary AI Interaction Points (Out of Scope for This Phase)

The following AI interaction points also lack Fred's voice but are NOT part of the five core engines targeted by VOICE-01 through VOICE-05. They may be addressed in a later phase:

| File | Current Persona | Issue |
|------|----------------|-------|
| `lib/fred/scoring/engine.ts` | "You are FRED, an expert startup advisor" | Generic FRED acronym, not Fred Cary |
| `lib/fred/scoring/prompts.ts` | "You are FRED, an AI advisor" | Generic FRED, not Fred Cary |
| `lib/fred/pitch/slide-classifier.ts` | "You are an expert pitch deck analyst" | Fully generic, no Fred identity |
| `lib/agents/fundraising/prompts.ts` | "channeling Fred Cary's deep expertise" | Mentions Fred but doesn't import fred-brain |
| `lib/agents/fundraising/tools.ts` | "You are an expert startup fundraising advisor" (4x) | Generic, no Fred identity |
| `lib/agents/growth/prompts.ts` | "channeling Fred Cary's practical approach" | Mentions Fred but doesn't import fred-brain |
| `lib/agents/growth/tools.ts` | "You are a growth strategy expert" (4x) | Generic, no Fred identity |
| `lib/agents/founder-ops/prompts.ts` | "channeling Fred Cary's decades of experience" | Mentions Fred but doesn't import fred-brain |
| `lib/agents/founder-ops/tools.ts` | "You are Fred Cary, a veteran venture builder" (1x), generic (2x) | Mixed |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fred Cary experience numbers | Hardcoded strings like "40+ years" | `FRED_BIO.yearsExperience` from fred-brain.ts | Already wrong in 2 files; single source of truth prevents drift |
| Fred Cary credentials summary | Inline prompt text listing companies | `getExperienceStatement()` and `getCredibilityStatement()` | Already exist as helper functions in fred-brain.ts |
| Fred's communication style rules | Inline "be direct, no BS" instructions | `FRED_COMMUNICATION_STYLE.voice` and `.doNot` | Already structured and ready to interpolate |
| Full conversational persona | Copy-pasting FRED_CAREY_SYSTEM_PROMPT | Compose from fred-brain.ts exports per engine | Full prompt is 184 lines; engines need focused subsets |

## Common Pitfalls

### Pitfall 1: Breaking Structured Output by Over-Prompting
**What goes wrong:** Adding too much persona text to system prompts for `generateObject()` calls can cause the AI to produce narrative text that violates Zod schema constraints.
**Why it happens:** The AI follows persona instructions ("tell stories from experience") even when schema requires `score: z.number().min(0).max(100)`.
**How to avoid:** Keep persona preamble short (3-5 lines) for structured output engines (Reality Lens, IRS, Pitch). Put Fred's voice in string fields only. The scoring guidelines and schema-specific instructions must remain dominant. Test with actual API calls to verify scores still validate.
**Warning signs:** Zod validation errors after prompt changes; AI returning scores outside expected ranges.

### Pitfall 2: Chat Pipeline is Not a Simple System Prompt Swap
**What goes wrong:** Assuming chat responses come from a single `streamText()` call with a system prompt, then looking for a system prompt to swap.
**Why it happens:** Most AI chat implementations use a simple system prompt + user message pattern. The Sahara chat pipeline uses an XState state machine with heuristic actors.
**How to avoid:** Understand that the chat pipeline generates responses through template strings in `decide.ts` (`buildResponseContent()`) and `synthesize.ts` (`generateRecommendation()`). Fred's voice must be injected into these template-building functions, not into a system prompt.
**Warning signs:** Looking for a system prompt in the chat pipeline and not finding one.

### Pitfall 3: Inconsistent Experience Numbers After Partial Fix
**What goes wrong:** Fixing "40+" to "50+" in one file but not others, or hardcoding "50+" instead of using `FRED_BIO.yearsExperience`.
**Why it happens:** Quick regex-replace without converting to imports.
**How to avoid:** Always import from `fred-brain.ts`. Never hardcode experience numbers in system prompts. After fixing, grep the entire codebase for remaining hardcoded numbers.
**Warning signs:** Grep for `\d+\+?\s*years` in lib/ returning any results outside of fred-brain.ts.

### Pitfall 4: Prompt Token Explosion
**What goes wrong:** Adding the full FRED_CAREY_SYSTEM_PROMPT (184 lines, ~2000 tokens) to every engine that makes multiple AI calls. Reality Lens makes 6 parallel calls (5 factors + synthesis), each prepending the full prompt.
**Why it happens:** Using the complete prompt instead of composing minimal context-appropriate preambles.
**How to avoid:** Use composable preambles of ~200-300 tokens max for structured output engines. Reserve the full prompt for conversational chat only. Calculate total additional token cost per assessment.
**Warning signs:** Increased latency or cost per assessment after changes.

### Pitfall 5: Losing Functional Instructions When Replacing Prompts
**What goes wrong:** Replacing the entire system prompt with Fred's persona and losing calibration guidelines, scoring instructions, or engine-specific rules.
**Why it happens:** Treating this as a "replace the prompt" task instead of "prepend persona to existing instructions".
**How to avoid:** The pattern is: `Fred Voice Preamble + "\n\n" + Existing Engine Instructions`. Never delete scoring guidelines, calibration rules, or schema instructions. They are functional, not persona-related.
**Warning signs:** Scoring distributions change significantly after prompt updates.

## Code Examples

### Example 1: Reality Lens System Prompt Replacement

Source: Derived from existing `lib/fred/reality-lens.ts` and `lib/fred-brain.ts`.

```typescript
// lib/fred/reality-lens.ts -- BEFORE
const SYSTEM_PROMPT = `You are FRED (Founder's Rational Expert Decision-maker), an expert startup advisor with decades of experience evaluating thousands of startup ideas.
...`;

// lib/fred/reality-lens.ts -- AFTER
import {
  FRED_BIO,
  FRED_IDENTITY,
  FRED_COMMUNICATION_STYLE,
  getExperienceStatement,
  getCredibilityStatement,
} from "@/lib/fred-brain";

const SYSTEM_PROMPT = `You are ${FRED_IDENTITY.name} -- serial entrepreneur, attorney, investor, and startup advisor with over ${FRED_BIO.yearsExperience} years of experience building companies and evaluating startup ideas.

${getExperienceStatement()}

${getCredibilityStatement()}

I use the Reality Lens framework to give founders my honest assessment across 5 dimensions. ${FRED_COMMUNICATION_STYLE.voice.primary}. ${FRED_COMMUNICATION_STYLE.voice.tone}.

Guidelines:
1. Be specific and actionable in your feedback
2. Score based on evidence, not potential
3. A score of 50 is "average" - most ideas should cluster around 40-60
4. Reserve scores above 80 for truly exceptional factors
5. Reserve scores below 20 for severe problems
6. When uncertain, say so and reflect it in confidence level
7. Focus on what can be validated or improved`;
```

### Example 2: IRS Engine System Prompt Replacement

```typescript
// lib/fred/irs/engine.ts -- AFTER
import {
  FRED_BIO,
  FRED_IDENTITY,
  FRED_COMPANIES,
  FRED_COMMUNICATION_STYLE,
} from "@/lib/fred-brain";

function getSystemPrompt(): string {
  return `You are ${FRED_IDENTITY.name}, evaluating startups for investor readiness -- not as a generic analyst, but as someone who has personally taken ${FRED_BIO.ipos} companies public, had ${FRED_BIO.acquisitions} acquired, and invested in ${FRED_COMPANIES.current[2].metrics.companiesLaunched}+ startups through IdeaPros.

With ${FRED_BIO.yearsExperience}+ years of experience and ${FRED_BIO.companiesFounded}+ companies founded, I know what investors look for because I've been on both sides of the table.

${FRED_COMMUNICATION_STYLE.voice.primary}. I tell founders the truth about their readiness, even when it's uncomfortable.

You evaluate startups across 6 categories:
${IRS_CATEGORIES.map(cat => `- ${CATEGORY_LABELS[cat]} (${Math.round(CATEGORY_WEIGHTS[cat] * 100)}%): ${CATEGORY_DESCRIPTIONS[cat]}`).join('\n')}

Guidelines:
- Be direct and honest - founders need the truth, not validation
- Score realistically - most early-stage startups are NOT investor-ready (40-60 range is common)
...`; // (keep remaining scoring guidelines unchanged)
}
```

### Example 3: Strategy Generator Fix (Minimal)

```typescript
// lib/fred/strategy/generator.ts -- AFTER
import { FRED_BIO, FRED_COMMUNICATION_STYLE } from "@/lib/fred-brain";

function buildSystemPrompt(
  template: { name: string; tone: string },
  input: StrategyInput
): string {
  return `You are Fred Cary, serial entrepreneur and startup advisor with ${FRED_BIO.yearsExperience}+ years of experience building and scaling companies. You have personally founded ${FRED_BIO.companiesFounded}+ companies, taken ${FRED_BIO.ipos} public, and had ${FRED_BIO.acquisitions} acquired. You speak directly, avoid corporate jargon, and give specific actionable advice based on real-world experience.

${template.tone}

You are writing a ${template.name} for ${input.startupName}.${input.industry ? ` The company operates in the ${input.industry} space.` : ''}${input.stage ? ` They are at the ${input.stage} stage.` : ''}

Write with authority and warmth. You are not a consultant generating templates -- you are a seasoned operator sharing hard-won wisdom. Be specific, be honest, and be useful.`;
}
```

### Example 4: Chat Pipeline Template Voice Injection

```typescript
// lib/fred/actors/decide.ts -- BEFORE (in buildResponseContent, auto_execute case)
case "auto_execute":
  return synthesis.recommendation;

// lib/fred/actors/decide.ts -- AFTER
import { getExperienceStatement, FRED_PHILOSOPHY } from "@/lib/fred-brain";

case "auto_execute":
  // For simple questions, return recommendation with Fred's voice
  if (input.intent === "question") {
    return synthesis.recommendation;
  }
  // For decisions, frame as Fred's experienced perspective
  return synthesis.recommendation;

// In buildResponseContent for "recommend":
case "recommend":
  const nextStepsText = synthesis.nextSteps.slice(0, 2).join("\n- ");
  return `Here's my take, based on what I've seen across ${FRED_BIO.companiesFounded}+ companies:\n\n${synthesis.recommendation}\n\n**Next Steps:**\n- ${nextStepsText}\n\n*Confidence: ${Math.round(synthesis.confidence * 100)}%*`;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded persona text in each engine | Centralized knowledge base (fred-brain.ts) | Already exists | fred-brain.ts is ready but not imported by engines |
| Full FRED_CAREY_SYSTEM_PROMPT everywhere | Composable preambles from exports | This phase introduces this | Right-sized prompts per engine context |
| Inline "30+"/"40+" experience numbers | `FRED_BIO.yearsExperience` | This phase fixes this | Prevents future drift |

## Open Questions

1. **Chat pipeline depth of voice injection**
   - What we know: The chat response is built from template strings in `decide.ts` and `synthesize.ts`, not from an AI call with a system prompt.
   - What's unclear: How deeply should Fred's voice be injected into these templates? Just the final response text? Or also the synthesis reasoning?
   - Recommendation: Start with the response templates in `decide.ts` (`buildResponseContent()`). The synthesis reasoning is internal and not user-facing, so it matters less.

2. **Scoring engine voice (out of scope?)**
   - What we know: The scoring engine (`lib/fred/scoring/engine.ts` and `scoring/prompts.ts`) uses "You are FRED" and "developed by Fred Cary" but doesn't speak AS Fred.
   - What's unclear: Whether VOICE-01 ("All AI interaction points") includes the scoring engine, which is an internal pipeline component not directly user-facing.
   - Recommendation: The scoring engine feeds into the chat pipeline, not into a user-visible output. Deprioritize it -- focus on the 5 user-facing engines first.

3. **Agent tools voice (out of scope)**
   - What we know: Fundraising, Growth, and Founder Ops agent tools have generic "expert advisor" prompts. Their system-level prompts mention "channeling Fred Cary" but the per-tool prompts do not.
   - What's unclear: Whether these are in scope for VOICE-01.
   - Recommendation: Out of scope for Phase 13. These are Studio-tier agent features that could be a separate phase.

4. **Token budget impact**
   - What we know: Adding Fred's voice preamble (~200-300 tokens) to each engine increases per-call cost.
   - What's unclear: Total impact on Reality Lens (5 parallel factor calls + synthesis = 6 calls, each gaining ~250 tokens = ~1500 additional tokens per assessment).
   - Recommendation: Acceptable cost. Keep preambles concise for structured output engines.

## Sources

### Primary (HIGH confidence)
- `lib/fred-brain.ts` -- Read in full (410 lines), all exports documented
- `lib/ai/prompts.ts` -- Read in full (246 lines), FRED_CAREY_SYSTEM_PROMPT and helpers documented
- `lib/fred/reality-lens.ts` -- Read in full (496 lines), system prompt and architecture documented
- `lib/fred/irs/engine.ts` -- Read in full (340 lines), system prompt and structured output documented
- `lib/fred/strategy/generator.ts` -- Read in full (193 lines), system prompt and generation flow documented
- `lib/fred/pitch/analyzers/index.ts` -- Read in full (163 lines), system prompt and structured output documented
- `lib/fred/actors/decide.ts` -- Read in full (360 lines), template-based response construction documented
- `lib/fred/actors/synthesize.ts` -- Read in full (530 lines), heuristic recommendation generation documented
- `lib/fred/actors/mental-models.ts` -- Read in full (622 lines), confirmed no AI system prompts
- `lib/fred/actors/validate-input.ts` -- Read in full (394 lines), confirmed rule-based, no AI calls
- `lib/fred/service.ts` -- Read in full (347 lines), XState service wrapper documented
- `lib/fred/machine.ts` -- Read in full (660 lines), full state machine flow documented
- `lib/ai/fred-client.ts` -- Read in full (569 lines), `generateStructuredReliable` API documented
- `lib/fred/scoring/engine.ts` -- Read in full (433 lines), scoring system prompt documented
- `lib/fred/scoring/prompts.ts` -- Read in full (242 lines), scoring prompt builder documented
- `lib/fred/pitch/slide-classifier.ts` -- Read (60 lines), confirmed generic classifier prompt
- `lib/fred/pitch/review-engine.ts` -- Read in full (162 lines), confirmed orchestrator only (no prompts)
- `app/api/fred/chat/route.ts` -- Read in full (330 lines), confirmed uses FredService (state machine)
- `app/api/fred/reality-lens/route.ts` -- Read in full (307 lines), confirmed delegates to assessIdea()
- `app/api/fred/analyze/route.ts` -- Read in full (162 lines), confirmed uses FredService
- `app/api/diagnostic/route.ts` -- Read (80 lines), confirmed imports FRED_CAREY_SYSTEM_PROMPT
- `lib/agents/fundraising/prompts.ts` -- Read in full, secondary scope documented
- `lib/agents/growth/prompts.ts` -- Read in full, secondary scope documented
- `lib/agents/founder-ops/prompts.ts` -- Read in full, secondary scope documented
- Full grep across codebase for all `system:`, `You are`, `generateObject`, `streamText`, `generateText`, `FRED_CAREY_SYSTEM_PROMPT`, `fred-brain`, and experience-year patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all files read directly, no external dependencies
- Architecture: HIGH -- every file in the AI pipeline read and documented
- Engine-specific analysis: HIGH -- each engine's prompt, schema, and generation pattern fully understood
- Chat pipeline architecture: HIGH -- full XState machine, all 6 actors, and template-based response construction traced
- Pitfalls: HIGH -- derived from direct code analysis, not speculation

**Research date:** 2026-02-07
**Valid until:** Indefinite (no external dependencies; only dependent on project source code which was read directly)
