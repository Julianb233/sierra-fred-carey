# Phase 15: Voice -- Helpers & Activation - Research

**Researched:** 2026-02-07
**Domain:** Activating unused fred-brain.ts exports and prompts.ts helpers across the Sahara platform
**Confidence:** HIGH

## Summary

This phase is a pure integration task -- all the helper functions and data exports already exist and are well-implemented. The work is connecting defined-but-unused exports to their natural integration points across the application. No new libraries, no architecture changes, and no complex algorithms are needed.

The codebase has 8 unused exports split across two files: `lib/fred-brain.ts` (FRED_MEDIA, FRED_TESTIMONIALS, getRandomQuote, getExperienceStatement, getCredibilityStatement) and `lib/ai/prompts.ts` (COACHING_PROMPTS, getPromptForTopic, getFredGreeting). Each has a clear, specific integration point. The chat interface currently has a hardcoded greeting string; the onboarding flow generates its welcome message inline; the SMS templates are generic; and the chat API has no topic detection or routing. All of these can be enhanced by importing and calling the existing helpers.

The most significant integration is wiring COACHING_PROMPTS and getPromptForTopic into the chat API. This requires adding topic detection to the existing validate-input actor (which already detects intent but not topic) and then using the detected topic to select the appropriate coaching prompt in the decide actor's response generation. The other integrations are straightforward import-and-call patterns.

**Primary recommendation:** Wire each unused export to its identified integration point using simple imports -- no new abstractions, no new APIs, no new components needed.

## Standard Stack

No new libraries are required. This phase uses only existing project infrastructure:

### Core (Already In Project)
| Library | Purpose | Relevance to Phase |
|---------|---------|-------------------|
| Next.js 16 | Framework | Chat API route, onboarding components |
| React 19 | UI | Onboarding components, chat interface |
| XState v5 | State machine | FRED cognitive pipeline (validate-input, decide actors) |
| Vercel AI SDK 6 | AI integration | Used by scoring/synthesis actors (not directly touched) |
| Zod | Validation | Chat request schema (may need topic field) |

### No New Dependencies
This phase adds zero new packages. All work is wiring existing code to existing integration points.

## Architecture Patterns

### Current Architecture Overview

The FRED chat system follows a state machine pipeline:

```
User Input → Chat API Route → FredService → XState Machine
                                              ├─ loadMemory
                                              ├─ validateInput (intent detection)
                                              ├─ mentalModels
                                              ├─ synthesize
                                              ├─ decide (builds response)
                                              └─ execute
```

The system prompt (`FRED_CAREY_SYSTEM_PROMPT`) is defined in `lib/ai/prompts.ts` and already imports from `fred-brain.ts`. However, it only imports: FRED_IDENTITY, FRED_BIO, FRED_COMPANIES, FRED_PHILOSOPHY, FRED_COMMUNICATION_STYLE, SAHARA_MESSAGING. It does NOT import FRED_MEDIA or FRED_TESTIMONIALS.

### Integration Map: Every Unused Export to Its Target

```
UNUSED EXPORT                    TARGET FILE(S)                           HOW
─────────────────────────────    ──────────────────────────────────────   ────────────────────────
FRED_MEDIA                      lib/ai/prompts.ts (system prompt)        Add media/publications to credibility section
                                 lib/fred/irs/engine.ts                  Include in IRS system prompt for authority
                                 lib/fred/strategy/generator.ts          Include in strategy doc system prompt

FRED_TESTIMONIALS                lib/ai/prompts.ts (system prompt)        Add testimonials section to system prompt
                                 lib/fred/irs/engine.ts                  Include in IRS for credibility

getRandomQuote()                 components/chat/chat-interface.tsx       Replace hardcoded FRED_GREETING
                                 lib/sms/templates.ts                    Add quote to weekly check-in message

getExperienceStatement()         components/chat/chat-interface.tsx       Include in dynamic greeting
                                 lib/sms/templates.ts                    Use in welcome SMS template

getCredibilityStatement()        components/chat/chat-interface.tsx       Include in dynamic greeting
                                 lib/fred/irs/engine.ts                  Add to IRS system prompt

COACHING_PROMPTS                 app/api/fred/chat/route.ts              Pass detected topic to service
getPromptForTopic()              lib/fred/actors/decide.ts               Use topic-specific prompt in response

getFredGreeting()                components/onboarding/fred-intro-step.tsx  Replace inline welcome message
```

### Pattern 1: Chat Greeting Activation (getRandomQuote + helpers)

**What:** Replace the hardcoded `FRED_GREETING` constant in `components/chat/chat-interface.tsx` with a dynamic greeting.

**Current code (chat-interface.tsx, lines 17-23):**
```typescript
const FRED_GREETING: Message = {
  id: "greeting",
  content: "Hey there! I'm Fred Cary...", // Hardcoded 4-paragraph greeting
  role: "assistant",
  timestamp: new Date(),
};
```

**Target pattern:**
```typescript
import { getRandomQuote, getExperienceStatement, getCredibilityStatement } from "@/lib/fred-brain";

function buildFredGreeting(): string {
  const quote = getRandomQuote();
  const experience = getExperienceStatement();
  const credibility = getCredibilityStatement();
  return `Hey there! ${experience}\n\n${credibility}\n\nThink of me as your digital co-founder, available 24/7. Whether you're validating an idea, preparing for fundraising, or figuring out your next big move -- I'm here to give you the straight truth.\n\n"${quote}" What's on your mind?`;
}
```

**Key consideration:** The greeting is rendered client-side. The helper functions (`getRandomQuote`, etc.) are pure functions that return strings -- no server-side dependencies. They can be imported directly into client components. This is safe because `fred-brain.ts` contains only constants and pure functions with no server imports.

### Pattern 2: Topic Detection + COACHING_PROMPTS Routing

**What:** Detect conversation topic from user messages and use topic-specific coaching prompts.

**Current state:** The `validateInputActor` (lib/fred/actors/validate-input.ts) already detects intent (decision_request, question, greeting, etc.) using regex patterns, but it does NOT detect topic (fundraising, pitchReview, strategy, positioning, mindset). The COACHING_PROMPTS object defines exactly these 5 topics with detailed prompt augmentations.

**Where topic detection should live:** In `validateInputActor` -- it already extracts keywords, intent, entities, and sentiment. Adding topic detection here is architecturally consistent.

**Topic detection approach:** The existing keyword extraction (line 368-393 in validate-input.ts) provides the raw material. Topic matching would use keyword mapping:

```typescript
// Topic keywords aligned with COACHING_PROMPTS keys
const TOPIC_KEYWORDS: Record<string, string[]> = {
  fundraising: ["fundraising", "raise", "investor", "vc", "capital", "pitch", "funding", "round", "valuation", "term sheet"],
  pitchReview: ["pitch", "deck", "slides", "presentation", "investor deck", "pitch deck"],
  strategy: ["strategy", "plan", "roadmap", "execute", "pivot", "direction", "next steps", "prioritize"],
  positioning: ["positioning", "differentiation", "market fit", "value prop", "messaging", "branding", "competitive"],
  mindset: ["mindset", "motivation", "stuck", "overwhelmed", "doubt", "confidence", "fear", "burnout", "stressed"],
};
```

**Where the topic gets used:** The `decideActor` (lib/fred/actors/decide.ts) builds the response content in `buildResponseContent()`. When a topic is detected, the response should be augmented with the relevant COACHING_PROMPTS entry. This requires:
1. Adding a `topic` field to the `ValidatedInput` type
2. Passing it through the pipeline to the decide actor
3. Augmenting the response with topic-specific coaching context

**Important:** `getPromptForTopic()` returns the FULL system prompt + coaching prompt. For the chat pipeline, we only need the coaching prompt portion (COACHING_PROMPTS[topic]), since the system prompt is already set. The function is more useful for direct AI calls outside the state machine pipeline.

### Pattern 3: Onboarding getFredGreeting Integration

**What:** Replace the inline welcome message in `fred-intro-step.tsx` with `getFredGreeting()`.

**Current code (fred-intro-step.tsx, lines 32-43):**
```typescript
const generateWelcome = () => {
  const name = startupInfo.name || "your startup";
  const stage = startupInfo.stage || "startup";
  const challenge = startupInfo.mainChallenge || "growth";

  const welcomeMessage = `Hey! So you're working on ${name}...`; // Hardcoded
  setMessages([{ id: "welcome", role: "assistant", content: welcomeMessage }]);
};
```

**Target pattern:** The current `getFredGreeting()` function returns a random generic greeting. For onboarding, we want BOTH the Fred personality (from getFredGreeting) AND the personalization (using startupInfo). Two approaches:

1. **Simple:** Use `getFredGreeting()` as-is for the opening line, then add personalized context
2. **Enhanced:** Create a new `getFredGreeting(startupInfo)` overload that accepts startup context

Recommendation: Approach 2 is better. Modify `getFredGreeting` in prompts.ts to optionally accept startup context parameters, keeping backward compatibility. The function is currently unused, so changing its signature has zero breaking-change risk.

### Pattern 4: SMS Template Enhancement

**What:** Add Fred personality to SMS messages using `getRandomQuote()` and `getExperienceStatement()`.

**Current SMS templates (lib/sms/templates.ts):**
- `getCheckinTemplate()` -- Generic "Hey {name}! Weekly check-in from Sahara."
- `getWelcomeTemplate()` -- Generic "Welcome to Sahara check-ins, {name}!"

**Constraint:** SMS messages must stay under 160 characters (single SMS segment). The helper functions return strings that are well over 160 characters. Only `getRandomQuote()` returns short enough content for SMS integration. Individual quotes range from ~25 to ~85 characters.

**Target pattern for check-in:**
```typescript
import { getRandomQuote } from "@/lib/fred-brain";

export function getCheckinTemplate(founderName: string, highlights?: string[]): string {
  const quote = getRandomQuote();
  // Include a Fred quote only when there's space
  const greeting = `Hey ${founderName}! "${quote}" - Fred`;
  // ... rest of template logic with SMS length constraint
}
```

**Important:** The 160-char limit means we can ONLY use getRandomQuote() (short strings) in SMS. getExperienceStatement() and getCredibilityStatement() are too long for SMS and should NOT be used there.

### Pattern 5: FRED_MEDIA and FRED_TESTIMONIALS in System Prompts

**What:** Add media presence and testimonials to AI prompts where Fred's credibility is relevant.

**Where credibility matters most:**
1. **IRS Engine** (`lib/fred/irs/engine.ts`) -- Currently uses a generic "expert VC analyst" prompt. Should reference Fred's track record.
2. **Strategy Generator** (`lib/fred/strategy/generator.ts`) -- Already mentions "40+ years" (incorrect, should be 50+). Should include media/testimonials for authority.
3. **Main System Prompt** (`lib/ai/prompts.ts`) -- Already includes social proof section but hardcodes the numbers. Could import from FRED_MEDIA for consistency.

**How to use FRED_MEDIA:** Do NOT dump all 148 podcast entries into prompts. Use the `socialMetrics`, `publications`, and `recognition` sub-objects. These are compact and relevant.

```typescript
import { FRED_MEDIA, FRED_TESTIMONIALS } from "@/lib/fred-brain";

// In prompt construction:
const credibilityBlock = `
Featured in: ${FRED_MEDIA.publications.join(", ")}
${FRED_MEDIA.recognition.join("; ")}
${FRED_MEDIA.podcastAppearances}+ podcast appearances
Social reach: ${FRED_MEDIA.socialMetrics.instagram.followers} Instagram, ${FRED_MEDIA.socialMetrics.youtube.views} YouTube views
`;
```

**How to use FRED_TESTIMONIALS:** Include 1-2 relevant testimonials in prompts where authority matters. The testimonials array has 4 entries -- short enough to include selectively.

### Anti-Patterns to Avoid

- **Dumping full FRED_MEDIA array into prompts:** The podcastAppearances count (148) is a number, not an array. There is no array of 148 entries in the codebase -- the number just represents documented appearances. Use the metadata (count, publications list) not raw data.
- **Breaking SMS character limits:** Do NOT use long helper function returns in SMS. Only getRandomQuote() fits.
- **Creating new API endpoints:** No new routes needed. All integration happens within existing code paths.
- **Over-engineering topic detection:** Simple keyword matching is sufficient. The AI models downstream handle nuance. Don't build an ML classifier for 5 topics.
- **Modifying the XState machine states:** Topic detection is just a new field on ValidatedInput, not a new state in the machine. Do NOT add new states to fredMachine.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Topic detection | ML classifier or LLM call for topic | Keyword matching against COACHING_PROMPTS keys | Only 5 topics, keywords are obvious, regex is fast and free |
| Dynamic greetings | Template engine | String concatenation with existing helpers | Helpers already return well-formatted strings |
| Credibility context | New data structures | FRED_MEDIA.publications + FRED_TESTIMONIALS directly | Data is already structured correctly |
| SMS personalization | Custom template system | Extend existing template functions | Templates already handle SMS length constraints |

## Common Pitfalls

### Pitfall 1: SMS Character Overflow
**What goes wrong:** Adding Fred quotes or experience statements makes SMS messages exceed 160 characters, causing multi-segment billing and potential delivery issues.
**Why it happens:** The helper functions return strings designed for web/chat, not SMS constraints.
**How to avoid:** Only use `getRandomQuote()` in SMS, and ALWAYS check final message length against MAX_SMS_LENGTH (160). The existing templates already do length truncation -- preserve this pattern.
**Warning signs:** Any SMS template function that doesn't call `.slice(0, MAX_SMS_LENGTH)` at the end.

### Pitfall 2: Client-Side Import of Server-Only Code
**What goes wrong:** Importing from `fred-brain.ts` in client components could fail if the file has server-side dependencies.
**Why it happens:** Not checking what `fred-brain.ts` imports.
**How to avoid:** `fred-brain.ts` has ZERO imports -- it's all constants and pure functions. This is safe for client-side use. However, `prompts.ts` imports from `fred-brain.ts` using `@/lib/fred-brain` path alias, which works in both client and server. No issue here.
**Warning signs:** Build errors mentioning "server-only" or "fs" or "node:" after imports.

### Pitfall 3: Topic Detection Conflicting with Intent Detection
**What goes wrong:** Adding topic detection that overrides or conflicts with the existing intent detection in validate-input.ts.
**Why it happens:** Confusing topic (what they're discussing) with intent (what they want to do). These are orthogonal dimensions.
**How to avoid:** Keep topic detection separate from intent detection. A user can have intent="question" AND topic="fundraising". Add topic as a NEW field on ValidatedInput, don't modify intent.
**Warning signs:** If topic detection changes the `intent` field value.

### Pitfall 4: FRED_GREETING Hydration Mismatch
**What goes wrong:** Using `getRandomQuote()` in the greeting causes React hydration mismatch because server-rendered HTML has one random quote and client-rendered has another.
**Why it happens:** `Math.random()` produces different results on server vs client.
**How to avoid:** The ChatInterface component is a client component ("use client"). The greeting is created in the component body, not during SSR. However, if the greeting is memoized with useMemo without proper deps, it could be recalculated on re-renders. Use `useState` with lazy initializer to compute the greeting ONCE on mount.
**Warning signs:** Console warnings about hydration mismatches.

### Pitfall 5: Breaking Existing Tests
**What goes wrong:** Changing the ValidatedInput type or modify helper function signatures breaks existing tests.
**Why it happens:** The fred machine has tests (`lib/fred/__tests__/fred-machine.test.ts`).
**How to avoid:** Make the `topic` field optional on ValidatedInput. Don't change existing function signatures -- only add optional parameters or create new overloads.
**Warning signs:** Test failures after type changes.

### Pitfall 6: Strategy Generator Still Says "40+ years"
**What goes wrong:** After activating helpers, the strategy generator still has its own hardcoded system prompt saying "40+ years" instead of "50+ years".
**Why it happens:** The `buildSystemPrompt` function in `lib/fred/strategy/generator.ts` (line 150) hardcodes "40+ years" instead of importing from fred-brain.ts.
**How to avoid:** This is technically a Phase 12 (VOICE-04/05) issue, but if Phase 12 hasn't been completed yet, this phase should at minimum flag it. If this phase fixes it, import `FRED_BIO.yearsExperience` and use it.
**Warning signs:** Grep for "40+" in lib/ directory.

## Code Examples

### Example 1: ValidatedInput Type Extension
```typescript
// In lib/fred/types.ts, add topic field to ValidatedInput:
export interface ValidatedInput {
  originalMessage: string;
  intent: InputIntent;
  topic?: CoachingTopic; // NEW -- optional topic detection
  entities: ExtractedEntity[];
  confidence: number;
  clarificationNeeded: ClarificationRequest[];
  keywords: string[];
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  urgency: "low" | "medium" | "high" | "critical";
}

// NEW type
export type CoachingTopic = "fundraising" | "pitchReview" | "strategy" | "positioning" | "mindset";
```

### Example 2: Topic Detection in validate-input.ts
```typescript
// Add to validate-input.ts after intent detection

function detectTopic(message: string, keywords: string[]): CoachingTopic | undefined {
  const topicKeywords: Record<CoachingTopic, string[]> = {
    fundraising: ["fundrais", "raise", "investor", "vc", "capital", "funding", "round", "valuation"],
    pitchReview: ["pitch", "deck", "slides", "presentation"],
    strategy: ["strategy", "plan", "roadmap", "pivot", "direction", "prioritize"],
    positioning: ["positioning", "differentiat", "market fit", "value prop", "brand", "competitive"],
    mindset: ["mindset", "motivat", "stuck", "overwhelm", "doubt", "confidence", "fear", "burnout"],
  };

  const lowerMessage = message.toLowerCase();
  let bestTopic: CoachingTopic | undefined;
  let bestScore = 0;

  for (const [topic, words] of Object.entries(topicKeywords)) {
    const score = words.filter(w => lowerMessage.includes(w) || keywords.some(k => k.includes(w))).length;
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic as CoachingTopic;
    }
  }

  return bestScore > 0 ? bestTopic : undefined;
}
```

### Example 3: Dynamic Chat Greeting
```typescript
// In components/chat/chat-interface.tsx
import { getRandomQuote, getExperienceStatement, getCredibilityStatement } from "@/lib/fred-brain";

function buildGreeting(): Message {
  return {
    id: "greeting",
    content: `Hey there! I'm Fred Cary. ${getExperienceStatement()}\n\n${getCredibilityStatement()}\n\nThink of me as your digital co-founder, available 24/7. "${getRandomQuote()}" What's on your mind?`,
    role: "assistant",
    timestamp: new Date(),
  };
}

// In component body:
const [greeting] = useState<Message>(() => buildGreeting());
```

### Example 4: FRED_MEDIA in IRS Prompt
```typescript
// In lib/fred/irs/engine.ts, getSystemPrompt():
import { FRED_MEDIA, FRED_TESTIMONIALS, FRED_BIO } from "@/lib/fred-brain";

function getSystemPrompt(): string {
  return `You are Fred Cary's AI, evaluating startups for investor readiness.
Fred's credentials: ${FRED_BIO.yearsExperience}+ years, ${FRED_BIO.companiesFounded}+ companies founded, ${FRED_BIO.ipos} IPOs.
Featured in: ${FRED_MEDIA.publications.slice(0, 5).join(", ")}.
${FRED_MEDIA.podcastAppearances}+ podcast appearances.

${FRED_TESTIMONIALS[0].quote} - ${FRED_TESTIMONIALS[0].name}, ${FRED_TESTIMONIALS[0].role}

You evaluate startups across 6 categories:
...`;  // rest of existing prompt
}
```

### Example 5: Onboarding with getFredGreeting
```typescript
// In components/onboarding/fred-intro-step.tsx
import { getFredGreeting } from "@/lib/ai/prompts";

useEffect(() => {
  const name = startupInfo.name || "your startup";
  const stage = startupInfo.stage || "startup";
  const challenge = startupInfo.mainChallenge || "growth";

  // Use getFredGreeting() for the opening, then add personalization
  const baseGreeting = getFredGreeting();
  const personalizedContext = `\n\nSo you're working on ${name} at the ${stage.replace("-", " ")} stage, focusing on ${challenge}. Let's dig in.`;

  setMessages([{
    id: "welcome",
    role: "assistant",
    content: baseGreeting + personalizedContext,
  }]);
}, [startupInfo]);
```

### Example 6: SMS with Fred Quote
```typescript
// In lib/sms/templates.ts
import { getRandomQuote } from "@/lib/fred-brain";

export function getCheckinTemplate(founderName: string, highlights?: string[]): string {
  const quote = getRandomQuote();
  const greeting = `Hey ${founderName}!`;
  const cta = 'Reply with your top 3 priorities.';

  // Try to include a Fred quote if there's space
  const withQuote = `${greeting} "${quote}" - Fred. ${cta}`;
  if (withQuote.length <= MAX_SMS_LENGTH) {
    return withQuote;
  }

  // Fall back to simpler message without quote
  const simple = `${greeting} Weekly check-in from Sahara. ${cta}`;
  return simple.slice(0, MAX_SMS_LENGTH);
}
```

## State of the Art

No version changes or deprecated patterns are relevant to this phase. All work uses existing, stable patterns already in the codebase.

| Aspect | Current State | Phase 15 Change |
|--------|--------------|----------------|
| Chat greeting | Hardcoded string constant | Dynamic with helpers |
| Topic routing | No topic detection | Keyword-based topic detection |
| Credibility in prompts | Only in FRED_CAREY_SYSTEM_PROMPT | Also in IRS and strategy prompts |
| SMS personality | Generic Sahara messaging | Fred quotes when space permits |
| Onboarding welcome | Inline template string | getFredGreeting() with personalization |

## Recommended Task Breakdown

Based on the integration map, the work naturally divides into 4 independent tasks:

1. **VOICE-11: Activate FRED_MEDIA and FRED_TESTIMONIALS** -- Import and use in IRS engine, strategy generator, and optionally enhance the main system prompt. Fixes the "40+ years" bug in strategy generator as a bonus.

2. **VOICE-12: Wire helpers into chat greeting and SMS** -- Replace hardcoded FRED_GREETING in chat-interface.tsx with dynamic greeting using getRandomQuote, getExperienceStatement, getCredibilityStatement. Add getRandomQuote to SMS check-in template.

3. **VOICE-13: COACHING_PROMPTS and topic routing** -- Add topic detection to validate-input.ts, add CoachingTopic type to types.ts, use detected topic in decide.ts to augment responses with COACHING_PROMPTS content.

4. **VOICE-14: getFredGreeting in onboarding** -- Replace inline welcome message in fred-intro-step.tsx with getFredGreeting(), enhanced with startup context personalization.

Tasks 1, 2, and 4 are independent and could be parallelized. Task 3 is the most complex due to type changes that flow through the state machine pipeline.

## Open Questions

1. **Should FRED_MEDIA/FRED_TESTIMONIALS go into the main FRED_CAREY_SYSTEM_PROMPT?**
   - What we know: The system prompt already has a "MY SOCIAL PROOF" section with hardcoded numbers. FRED_MEDIA has the same data as structured objects.
   - What's unclear: Whether replacing hardcoded social proof with imported values is in scope (Phase 12 may handle this as part of data consistency work).
   - Recommendation: At minimum, use FRED_MEDIA/FRED_TESTIMONIALS in IRS and strategy prompts. Updating the main system prompt's social proof section to import from FRED_MEDIA is a nice-to-have if Phase 12 hasn't done it.

2. **Should topic detection be keyword-based or AI-powered?**
   - What we know: The existing intent detection in validate-input.ts is entirely keyword/regex-based. The system already uses AI in later pipeline stages (scoring, synthesis).
   - What's unclear: Whether keyword-based topic detection is accurate enough for the 5 coaching topics.
   - Recommendation: Start with keyword-based. It's fast, free, and the 5 topics have distinct vocabulary. The AI models downstream can handle nuance even if topic detection is imperfect. Can always upgrade later.

3. **Should getFredGreeting be modified to accept parameters, or should personalization be separate?**
   - What we know: getFredGreeting() is currently parameterless and returns a random generic greeting. The onboarding needs both Fred personality AND startup-specific personalization.
   - What's unclear: Whether to modify the function signature or compose externally.
   - Recommendation: Add an optional parameter to getFredGreeting for startup context. The function is currently unused, so changing its signature has zero risk. This keeps personalization logic centralized.

## Sources

### Primary (HIGH confidence)
- `lib/fred-brain.ts` -- Read directly, all exports verified (lines 314-411)
- `lib/ai/prompts.ts` -- Read directly, all exports verified (lines 186-246)
- `app/api/fred/chat/route.ts` -- Read directly, full route handler analyzed (330 lines)
- `lib/fred/actors/validate-input.ts` -- Read directly, intent detection analyzed (394 lines)
- `lib/fred/actors/decide.ts` -- Read directly, response building analyzed (360 lines)
- `lib/fred/machine.ts` -- Read directly, state machine pipeline verified (660 lines)
- `lib/fred/service.ts` -- Read directly, service API verified (347 lines)
- `components/chat/chat-interface.tsx` -- Read directly, hardcoded greeting confirmed (85 lines)
- `components/onboarding/fred-intro-step.tsx` -- Read directly, inline welcome confirmed (253 lines)
- `components/onboarding/welcome-step.tsx` -- Read directly, hardcoded quote confirmed (143 lines)
- `lib/sms/templates.ts` -- Read directly, generic templates confirmed (70 lines)
- `lib/fred/irs/engine.ts` -- Read directly, generic system prompt confirmed (340 lines)
- `lib/fred/strategy/generator.ts` -- Read directly, "40+ years" bug confirmed (193 lines)
- `lib/fred/scoring/prompts.ts` -- Read directly (242 lines)

### Verified via Grep (HIGH confidence)
- FRED_MEDIA: confirmed NEVER imported outside fred-brain.ts
- FRED_TESTIMONIALS: confirmed NEVER imported outside fred-brain.ts
- getRandomQuote: confirmed NEVER called
- getExperienceStatement: confirmed NEVER called
- getCredibilityStatement: confirmed NEVER called
- COACHING_PROMPTS: confirmed NEVER used outside prompts.ts
- getPromptForTopic: confirmed NEVER called
- getFredGreeting: confirmed NEVER called

## Metadata

**Confidence breakdown:**
- Integration points: HIGH -- Every file was read directly, every import/export verified with grep
- Topic detection approach: HIGH -- Consistent with existing codebase patterns (keyword/regex based)
- SMS constraints: HIGH -- Templates already enforce 160-char limit, pattern is clear
- Type changes: HIGH -- ValidatedInput interface is well-understood, change is additive (optional field)

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (stable -- no external dependencies or library version concerns)
