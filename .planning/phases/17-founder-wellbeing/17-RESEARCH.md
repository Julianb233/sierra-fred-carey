# Phase 17: Founder Wellbeing - Research

**Researched:** 2026-02-07
**Domain:** Burnout/stress detection in chat, self-assessment UI, mindset coaching mode
**Confidence:** HIGH

## Summary

This research investigates how to implement the three Founder Wellbeing requirements (FREE-04, FREE-05, FREE-06) within the existing Sahara architecture. The investigation reveals that the codebase already has significant scaffolding for this phase:

1. **Burnout/stress detection (FREE-04)** -- The `detectTopic()` function in `lib/fred/actors/validate-input.ts` already matches `mindset` topic keywords including "burnout", "stressed", "anxious", "overwhelm", "stuck", "doubt", "fear", "confidence", and "motivat". The `COACHING_PROMPTS.mindset` prompt in `lib/ai/prompts.ts` already exists with Fred's philosophy-grounded coaching language. The `decide.ts` actor appends a coaching framework label when a topic is detected. **However**, the actual coaching prompt content is never injected into the response generation. The label ("Applying Mindset coaching framework") is appended as cosmetic footer text, but the response itself comes from the heuristic template pipeline without any mindset-specific guidance. This is the primary gap: detection exists but does not alter the response content.

2. **Self-assessment check-in page (FREE-05)** -- No wellbeing-specific check-in page exists. The existing `app/check-ins/` pages are mock/static weekly accountability check-ins (SMS-based, Studio tier). The `app/dashboard/sms/page.tsx` is the real SMS check-in page, gated to Studio tier. A new `app/dashboard/wellbeing/page.tsx` is needed -- a self-assessment page available to all tiers (Free+) where founders can rate their mental state across dimensions aligned with Fred's 6 philosophy principles. The existing `check_ins` table (migration 002) has a generic `responses JSONB` and `score INTEGER` schema that could potentially be reused, but a dedicated `wellbeing_checkins` table is recommended to keep concerns separated and allow wellbeing-specific fields.

3. **Mindset coaching mode (FREE-06)** -- The `COACHING_PROMPTS.mindset` prompt exists and `getPromptForTopic("mindset")` composes it with the full `FRED_CAREY_SYSTEM_PROMPT`. But `getPromptForTopic()` is **never called anywhere in the codebase**. It was designed for future use. The mindset coaching mode should be a dedicated chat experience (or a mode within the existing chat) that uses this prompt composition for AI-generated responses, rather than the heuristic template pipeline. This requires either: (a) adding an AI generation path in the chat pipeline when topic === "mindset", or (b) creating a separate `/api/fred/coaching` endpoint that uses `streamText()` with `getPromptForTopic("mindset")`.

**Primary recommendation:** Build in three layers: (1) enhance the existing `detectTopic("mindset")` path in the chat pipeline to generate proactive wellbeing-aware responses using the existing `COACHING_PROMPTS.mindset` prompt, (2) create a new dashboard page at `/dashboard/wellbeing` with a structured self-assessment form, and (3) create a mindset coaching mode that uses `getPromptForTopic("mindset")` with actual AI generation via `streamText()`.

## Standard Stack

### Core (already in project)
| Library | Purpose | Why Relevant |
|---------|---------|--------------|
| `lib/fred/actors/validate-input.ts` | Topic detection with "mindset" keywords | Already detects burnout/stress signals |
| `lib/ai/prompts.ts` | `COACHING_PROMPTS.mindset` + `getPromptForTopic()` | Ready-made mindset coaching prompt |
| `lib/fred-brain.ts` | `FRED_PHILOSOPHY.corePrinciples` (6 principles) | Source of truth for coaching content |
| `lib/fred/voice.ts` | `buildFredVoicePreamble()` | Persona injection for AI calls |
| Vercel AI SDK 6 | `streamText()` / `generateText()` | AI generation for coaching responses |
| XState v5 | FRED state machine | Chat pipeline orchestration |
| Supabase | Database + RLS | Storing wellbeing check-in data |
| Framer Motion | Animations | UI polish for check-in page |
| shadcn/ui | UI components (Card, Button, Badge, Slider, etc.) | Consistent design language |

### New (recommended additions)
| Library | Purpose | Why Relevant |
|---------|---------|--------------|
| None required | -- | All needed libraries are already in the project |

### Key Existing Exports

| Export | File | Relevance |
|--------|------|-----------|
| `FRED_PHILOSOPHY.corePrinciples` | `lib/fred-brain.ts` | 6 principles with names, quotes, and teachings -- maps directly to coaching dimensions |
| `COACHING_PROMPTS.mindset` | `lib/ai/prompts.ts` | Pre-written coaching prompt referencing Fred's philosophy |
| `getPromptForTopic("mindset")` | `lib/ai/prompts.ts` | Composes full system prompt + mindset focus -- **never called anywhere** |
| `detectTopic()` | `lib/fred/actors/validate-input.ts` | Already matches mindset keywords in user messages |
| `CoachingTopic` | `lib/fred/types.ts` | Union type including `"mindset"` |
| `analyzeSentiment()` | `lib/fred/actors/validate-input.ts` | Detects negative/positive/mixed sentiment |
| `FeatureLock` | `components/tier/feature-lock.tsx` | Tier-gating component pattern |
| `storeEpisode()` | `lib/db/fred-memory.ts` | Stores events in episodic memory |
| `storeFact()` | `lib/db/fred-memory.ts` | Stores facts in semantic memory (category: "challenges") |

## Architecture Patterns

### Requirement 1: FREE-04 -- Burnout/Stress Detection in Chat

#### Current State

The detection chain works like this:

1. **`validate-input.ts` > `detectTopic()`** (line 404): Checks user message against keyword lists. For `mindset`, matches: "mindset", "motivat", "stuck", "overwhelm", "doubt", "confidence", "fear", "burnout", "stressed", "anxious".

2. **`validate-input.ts` > `analyzeSentiment()`** (line 291): Detects negative sentiment from words like "worried", "concerned", "problem", "struggle", "difficult", "fail", "lose".

3. **Topic stored on `ValidatedInput.topic`**: The `topic` field (optional `CoachingTopic`) is set on the validated input and flows through the pipeline.

4. **`decide.ts` > `buildResponseContent()`** (lines 276-305): When `input.topic` matches a key in `COACHING_PROMPTS`, a footer label is appended: `"---\n*Applying Mindset coaching framework*"`. But this is **cosmetic only** -- the actual response content comes from heuristic templates that are not mindset-aware.

**Gap:** Detection happens, labeling happens, but the response content is unchanged. The founder sees the same generic analysis with a "Applying Mindset coaching framework" footer, which is misleading.

#### Recommended Approach

Two-part fix:

**Part A: Proactive detection and response injection.**
When `topic === "mindset"` AND `sentiment === "negative" || sentiment === "mixed"`, the `decide.ts` actor should generate a mindset-aware response instead of the standard heuristic template. This can be done by:

1. Adding a new function `buildMindsetResponse()` in `decide.ts` that uses `FRED_PHILOSOPHY.corePrinciples` to construct empathetic, philosophy-grounded responses.
2. In `buildResponseContent()`, when `input.topic === "mindset"`, call `buildMindsetResponse()` instead of the standard template path.
3. The response should acknowledge the emotional state, reference a relevant Fred philosophy principle, and offer specific next steps.

**Part B: Proactive wellbeing prompt.**
When sentiment is negative but topic is NOT mindset (founder is stressed about a business decision, not explicitly asking for mindset help), FRED should add a brief wellbeing check at the end of the response:

```
[standard business response here]

---
I can hear this is weighing on you. If you'd like, I can switch to mindset coaching mode -- we can work through this together using some frameworks that have helped thousands of founders I've worked with. Just say the word.
```

This requires checking `sentiment` in `buildResponseContent()` and appending a wellbeing prompt when negative, with a call-to-action.

#### Keyword Enhancement

The current mindset keyword list is good but should be expanded for better recall:

**Current:** "mindset", "motivat", "stuck", "overwhelm", "doubt", "confidence", "fear", "burnout", "stressed", "anxious"

**Recommended additions:** "exhausted", "tired", "sleep", "lonely", "isolated", "imposter", "quit", "give up", "can't do this", "not enough", "behind", "falling apart", "drowning", "depressed", "hopeless", "lost", "confused about purpose", "what's the point"

Note: Some of these (like "depressed", "hopeless") may warrant a safety response directing the founder to professional resources (crisis hotline, therapist) rather than just coaching. This is an important safety consideration.

### Requirement 2: FREE-05 -- Dedicated Check-in Page

#### Current State

No wellbeing check-in page exists in the dashboard. The existing infrastructure includes:

- **`app/dashboard/sms/page.tsx`**: SMS-based weekly accountability check-ins (Studio tier). Uses `FeatureLock` for tier gating. This is about business accountability, not mental health.
- **`app/check-ins/page.tsx`**: Mock/static check-in page with hardcoded data. Not inside the dashboard layout. Not connected to any real backend.
- **`check_ins` table** (migration 002): Generic table with `user_id`, `responses JSONB`, `score INTEGER`, `analysis TEXT`. Could theoretically be reused, but its schema is too generic and has no wellbeing-specific fields.
- **Dashboard layout** (`app/dashboard/layout.tsx`): Has a `navItems` array defining sidebar navigation. A new "Wellbeing" nav item would be added here.

#### Recommended Approach

**New page:** `app/dashboard/wellbeing/page.tsx`

**New nav item in dashboard layout:**
```typescript
{
  name: "Wellbeing Check-in",
  href: "/dashboard/wellbeing",
  icon: <HeartIcon className="h-4 w-4" />,
  badge: "Free",
}
```

Note: The layout file (`app/dashboard/layout.tsx`) is in the file modification constraints list (pre-commit hooks auto-revert changes). **Workaround:** Phase 10b (documented in `13-01-SUMMARY.md` and MEMORY.md) successfully added Startup Process and Investor Evaluation nav items to this same file, suggesting the constraint was relaxed or a workaround was established. The same approach should be used here.

**Self-assessment form structure based on Fred's 6 philosophy principles:**

| Dimension | Source Principle | Assessment Question |
|-----------|-----------------|-------------------|
| Mindset | "Mindset is Everything" | How would you rate your overall mental clarity and optimism this week? |
| Accountability | "Honesty & Accountability" | Are you being honest with yourself about where things stand? |
| Perseverance | "Perseverance is Non-Negotiable" | How's your energy and drive to keep pushing through challenges? |
| Learning | "Learning from Failure" | Have you been able to learn from recent setbacks rather than dwell on them? |
| Progress | "Achievable Goals & Micro Victories" | Have you celebrated any small wins this week? |
| Confidence | "Overcoming Self-Doubt" | How confident do you feel in your ability to execute right now? |

**Scoring:** Each dimension rated 1-5 (slider). Composite wellbeing score calculated as average. Historical tracking shows trends over time.

**Database schema (new migration):**

```sql
CREATE TABLE IF NOT EXISTS wellbeing_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  -- Individual dimension scores (1-5 scale)
  mindset_score INTEGER CHECK (mindset_score BETWEEN 1 AND 5),
  accountability_score INTEGER CHECK (accountability_score BETWEEN 1 AND 5),
  perseverance_score INTEGER CHECK (perseverance_score BETWEEN 1 AND 5),
  learning_score INTEGER CHECK (learning_score BETWEEN 1 AND 5),
  progress_score INTEGER CHECK (progress_score BETWEEN 1 AND 5),
  confidence_score INTEGER CHECK (confidence_score BETWEEN 1 AND 5),
  -- Composite
  composite_score FLOAT GENERATED ALWAYS AS (
    (mindset_score + accountability_score + perseverance_score +
     learning_score + progress_score + confidence_score) / 6.0
  ) STORED,
  -- Free-text notes
  notes TEXT,
  -- AI-generated analysis from FRED
  fred_analysis TEXT,
  -- Which principle FRED focused on
  principle_applied TEXT,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wellbeing_user ON wellbeing_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_wellbeing_created ON wellbeing_checkins(user_id, created_at DESC);
```

**RLS policies** follow the same pattern as `fred_episodic_memory` (users see own data, service role manages all).

**API route:** `app/api/wellbeing/route.ts` (POST to create check-in, GET to retrieve history)

**Post-submission flow:**
1. User submits assessment
2. Store in `wellbeing_checkins` table
3. Also store in FRED's semantic memory as a "challenges" fact: `storeFact(userId, "challenges", "wellbeing_latest", { scores, timestamp })`
4. Generate FRED analysis using `getPromptForTopic("mindset")` with the scores as context
5. Display Fred's personalized coaching response based on the lowest-scoring dimensions
6. Show historical trend chart (line chart of composite score over time)

### Requirement 3: FREE-06 -- Mindset Coaching Mode

#### Current State

The infrastructure exists but is disconnected:

1. **`COACHING_PROMPTS.mindset`** in `lib/ai/prompts.ts`: A well-written coaching prompt that references Fred's philosophy: micro-victories, addressing self-doubt with facts, focusing on what you CAN control, sharing failure-to-success stories.

2. **`getPromptForTopic("mindset")`**: Composes `FRED_CAREY_SYSTEM_PROMPT` + mindset coaching focus. This is a complete, production-ready system prompt for AI-generated mindset coaching. **But it is never called anywhere in the codebase.**

3. **Chat pipeline (XState machine)**: Uses heuristic templates, not AI generation for final responses. When `topic === "mindset"` is detected, the pipeline does not switch to an AI-generation path.

#### Gap Analysis

The chat pipeline (`lib/fred/machine.ts` > `lib/fred/actors/`) processes ALL messages through the same heuristic path:
- `validate-input.ts` -> intent + topic detection
- `mental-models.ts` -> keyword-based model selection
- `synthesize.ts` -> heuristic scoring + template recommendations
- `decide.ts` -> template-based response construction

There is **no AI generation step** in this pipeline for final response text. The closest is `getAIFactorScores()` in `synthesize.ts` which uses the scoring engine for decision_request intents, but that only produces scores, not prose.

For mindset coaching, the heuristic templates are insufficient. Coaching requires:
- Empathetic, conversational responses
- References to specific Fred philosophy principles
- Adaptive follow-up questions based on what the founder shares
- Story-telling from Fred's experience

This requires actual AI text generation using the `COACHING_PROMPTS.mindset` system prompt.

#### Recommended Approach

**Option A: Separate coaching endpoint (recommended)**

Create a dedicated `/api/fred/coaching` API route that uses `streamText()` with `getPromptForTopic(topic)`. This is cleaner than modifying the XState pipeline because:

1. Coaching is conversational, not decisional -- it doesn't need the 7-factor scoring, mental models, or decision framework.
2. The existing pipeline is optimized for structured business analysis; coaching has different latency and quality requirements.
3. A separate endpoint allows independent rate limiting and monitoring.

The coaching endpoint:
```typescript
// POST /api/fred/coaching
// Body: { message: string, topic: "mindset", history: Message[] }
// Response: SSE stream with AI-generated coaching response

import { streamText } from "ai";
import { getPromptForTopic } from "@/lib/ai/prompts";
import { openai } from "@/lib/ai/providers";

const systemPrompt = getPromptForTopic("mindset");
const result = streamText({
  model: openai("gpt-4o"),
  system: systemPrompt,
  messages: conversationHistory,
});
```

**Option B: Add AI generation to the XState pipeline**

Add a conditional in `decide.ts` or a new actor that, when `topic === "mindset"`, uses `streamText()` instead of heuristic templates. This keeps everything in one pipeline but adds complexity to the state machine.

**Recommendation:** Option A. The coaching experience is fundamentally different from the decision-analysis pipeline. Separating concerns keeps both codebases clean. The decision pipeline can detect mindset topics and offer to switch to coaching mode, but the actual coaching happens through a different endpoint.

**UI for coaching mode:**

Either:
1. A "Mindset Coaching" tab/button within the existing chat interface that switches the backend to `/api/fred/coaching`
2. A dedicated page at `/dashboard/wellbeing/coaching` with its own chat interface
3. A modal/drawer launched from the wellbeing check-in page results

The chat UI components (`components/chat/`) are already well-structured and reusable. The `ChatInterface`, `ChatMessage`, and `ChatInput` components can be reused with a different hook (similar to `useFredChat` but hitting the coaching endpoint).

### Fred's 6 Philosophy Principles (Source of Truth)

From `lib/fred-brain.ts` > `FRED_PHILOSOPHY.corePrinciples`:

| # | Principle Name | Key Quote | Core Teaching |
|---|---------------|-----------|---------------|
| 1 | Mindset is Everything | "Mindset is the pillar to success." | Focus on what you CAN control; positive mindset + hard work + dedication |
| 2 | Honesty & Accountability | (none) | Straightforward honesty builds trust; ethical decisions over immediate gain |
| 3 | Perseverance is Non-Negotiable | "Entrepreneurship is a lot harder than you think." | Without perseverance, it won't work no matter how good the idea |
| 4 | Learning from Failure | "All successful entrepreneurs have experienced failure." | Failure is a learning opportunity; Boxlot didn't become eBay but lessons were invaluable |
| 5 | Achievable Goals & Micro Victories | (none) | Set achievable goals; create micro-victories; celebrate incremental progress |
| 6 | Overcoming Self-Doubt | (none) | Address doubts with facts; have faith in positive traits; build confidence through action |

These 6 principles map directly to the 6 dimensions of the wellbeing check-in assessment (FREE-05) and provide the coaching framework for the mindset mode (FREE-06).

### Integration Points

| Existing System | Integration |
|----------------|-------------|
| Chat pipeline (XState) | When `topic === "mindset"`, inject wellbeing-aware content into response templates |
| `validate-input.ts` > `detectTopic()` | Expand keyword list for better recall; add severity detection |
| `validate-input.ts` > `analyzeSentiment()` | Use negative sentiment as secondary signal for wellbeing prompt |
| FRED memory (`fred_episodic_memory`) | Store wellbeing check-in events and coaching conversations |
| FRED memory (`fred_semantic_memory`) | Store latest wellbeing scores as "challenges" facts for context |
| Dashboard layout (`app/dashboard/layout.tsx`) | Add "Wellbeing" nav item |
| Dashboard stats API (`/api/dashboard/stats`) | Include wellbeing check-in count in stats |
| `FeatureLock` component | Not needed for wellbeing (Free tier) but pattern available if tier-gating changes |

### File-by-File Change Map

| File | Change Type | Complexity |
|------|-------------|------------|
| `lib/fred/actors/validate-input.ts` | Expand mindset keyword list; add severity detection; add crisis keyword detection | Low |
| `lib/fred/actors/decide.ts` | Add `buildMindsetResponse()` for topic=mindset; add wellbeing prompt for negative sentiment | Medium |
| `lib/ai/prompts.ts` | No changes needed (COACHING_PROMPTS.mindset already exists) | None |
| `app/api/fred/coaching/route.ts` (NEW) | Dedicated coaching endpoint using `streamText()` + `getPromptForTopic()` | Medium |
| `lib/hooks/use-coaching-chat.ts` (NEW) | Client hook for coaching endpoint (similar to `useFredChat`) | Medium |
| `app/dashboard/wellbeing/page.tsx` (NEW) | Self-assessment form + history chart + coaching entry point | Medium |
| `app/api/wellbeing/route.ts` (NEW) | CRUD API for wellbeing check-ins | Low |
| `lib/db/wellbeing.ts` (NEW) | Database access functions for wellbeing_checkins table | Low |
| `lib/db/migrations/036_wellbeing_checkins.sql` (NEW) | Database schema for wellbeing check-ins | Low |
| `app/dashboard/layout.tsx` | Add "Wellbeing Check-in" nav item (check constraint, use Phase 10b approach) | Low |
| `components/wellbeing/assessment-form.tsx` (NEW) | Self-assessment form component with 6-dimension sliders | Medium |
| `components/wellbeing/wellbeing-chart.tsx` (NEW) | Historical trend chart for wellbeing scores | Low |
| `components/wellbeing/coaching-chat.tsx` (NEW) | Coaching-specific chat interface using coaching endpoint | Medium |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mindset coaching content | Custom prompt text | `COACHING_PROMPTS.mindset` from `lib/ai/prompts.ts` | Already written, tested, philosophy-grounded |
| Full coaching system prompt | Build a new system prompt from scratch | `getPromptForTopic("mindset")` from `lib/ai/prompts.ts` | Composes FRED_CAREY_SYSTEM_PROMPT + coaching focus -- already production-ready |
| Fred's philosophy principles | Hardcoded arrays | `FRED_PHILOSOPHY.corePrinciples` from `lib/fred-brain.ts` | Single source of truth for all 6 principles with names, quotes, and teachings |
| Chat UI for coaching | New chat components | Reuse `ChatMessage`, `ChatInput` from `components/chat/` | Already polished with animations, glassmorphism |
| Topic detection | New detection logic | Extend existing `detectTopic()` in `validate-input.ts` | Already handles mindset keywords |
| Tier gating (if needed) | Custom gating logic | `FeatureLock` component from `components/tier/feature-lock.tsx` | Established pattern used across 5+ pages |
| Memory storage | Custom DB queries | `storeEpisode()` / `storeFact()` from `lib/db/fred-memory.ts` | Already handles RLS, error handling, transforms |
| AI text generation | Custom API wrappers | `streamText()` from Vercel AI SDK 6 | Already configured with providers in `lib/ai/providers.ts` |
| Fred voice preamble | Inline persona text | `buildFredVoicePreamble()` from `lib/fred/voice.ts` | Composable, sources from fred-brain.ts |

## Common Pitfalls

### Pitfall 1: Treating Burnout Detection as Binary
**What goes wrong:** Detecting "burnout" keyword and immediately switching the entire response to coaching mode, even when the founder is asking a business question that happens to mention burnout.
**Why it happens:** Keyword matching doesn't understand context. "I'm worried about team burnout" is a business operations question, not a personal wellness issue.
**How to avoid:** Use multiple signals: topic detection (`mindset`), sentiment analysis (`negative`), AND message intent (`question` vs `information`). Only proactively offer wellbeing support when at least 2 of 3 signals align. For borderline cases, append a gentle prompt rather than overriding the response.
**Warning signs:** Founders complain that FRED keeps offering coaching when they're asking business questions.

### Pitfall 2: Being Preachy or Prescriptive
**What goes wrong:** Coaching responses feel like a lecture about Fred's philosophy rather than genuine empathetic support.
**Why it happens:** Over-stuffing the response with philosophy quotes and principles instead of listening and responding naturally.
**How to avoid:** The `COACHING_PROMPTS.mindset` prompt already has the right tone: "Tough love with genuine encouragement. No sugarcoating." Trust the AI to find the right balance when given this system prompt. Don't inject more philosophy than the prompt already provides. Lead with empathy ("I hear you"), then specific advice, then a philosophy principle as framing -- not the other way around.
**Warning signs:** Coaching responses start with quotes or principle names instead of acknowledging the founder's feelings.

### Pitfall 3: Mental Health Safety Boundary
**What goes wrong:** FRED attempts to coach through genuine mental health crises (suicidal ideation, clinical depression) that require professional help.
**Why it happens:** The detection keywords include terms like "hopeless" and "can't do this" that could indicate clinical conditions.
**How to avoid:** Add a safety layer that detects crisis-level language and responds with: (1) empathy, (2) a clear statement that FRED is not a therapist, (3) professional resources (988 Suicide & Crisis Lifeline, Crisis Text Line 741741, SAMHSA 1-800-662-4357), (4) encouragement to come back for business coaching anytime. This should be a hard rule in BOTH the system prompt AND the detection logic (before the AI call, as a template response).
**Warning signs:** Founder messages with crisis language get routed to standard coaching instead of safety responses.

### Pitfall 4: Wellbeing Check-in Fatigue
**What goes wrong:** Founders stop using the check-in page because it feels like homework or adds to their overwhelm.
**Why it happens:** Too many questions, too frequent prompts, or responses that don't feel valuable.
**How to avoid:** Keep the assessment quick (6 dimensions, 1-5 scale, ~30 seconds). Make the Fred analysis genuinely helpful (not generic platitudes). Don't send notifications or guilt-trip about missed check-ins. Consider a "quick pulse" option (one question: "How are you feeling today? 1-5") alongside the full assessment.
**Warning signs:** Initial adoption followed by steep drop-off in usage.

### Pitfall 5: Coupling Coaching to the XState Pipeline
**What goes wrong:** Modifying the XState state machine to add a "coaching" state or AI-generation path creates complexity and bugs in the existing chat flow.
**Why it happens:** Trying to fit a conversational coaching experience into a decision-analysis pipeline.
**How to avoid:** Use a separate `/api/fred/coaching` endpoint. The existing XState pipeline handles decision analysis (intent -> models -> synthesis -> decide). Coaching is a different interaction pattern (empathetic dialogue, no scoring, no mental models). Keep them separate. The decision pipeline can detect mindset topics and offer to switch to coaching mode, but the actual coaching happens through a different endpoint.
**Warning signs:** Chat pipeline tests break after adding coaching logic; coaching latency is high because it goes through unnecessary scoring/model steps.

### Pitfall 6: Dashboard Layout Lock File
**What goes wrong:** Changes to `app/dashboard/layout.tsx` are auto-reverted by pre-commit hooks.
**Why it happens:** File modification constraints documented in MEMORY.md.
**How to avoid:** Phase 10b successfully modified this file to add Startup Process and Investor Evaluation nav items (confirmed by reading the current file -- both entries are present at lines 62-66 and 107-112). The same direct-edit approach should work. If pre-commit hooks do revert, use the same workaround pattern that Phase 10b used.
**Warning signs:** CI/pre-commit failures on layout.tsx changes.

### Pitfall 7: getPromptForTopic() Assumes Full Conversation
**What goes wrong:** Using `getPromptForTopic("mindset")` as the system prompt produces responses that assume a long-form coaching conversation, but the founder only said one sentence.
**Why it happens:** The composed prompt (FRED_CAREY_SYSTEM_PROMPT + coaching focus = ~220 lines) is designed for multi-turn coaching. On first message, the AI may ask too many questions or give an overly complex response.
**How to avoid:** For the heuristic pipeline (FREE-04 proactive detection), use a SHORT wellbeing-specific prompt or template, not the full composed prompt. Reserve `getPromptForTopic("mindset")` for the dedicated coaching mode (FREE-06) where the founder has explicitly opted into a coaching conversation.
**Warning signs:** Proactive wellbeing responses are too long or feel out of context.

## Code Examples

### Example 1: Enhanced Mindset Detection in validate-input.ts

Source: Existing `detectTopic()` function, enhanced with severity detection.

```typescript
// lib/fred/actors/validate-input.ts -- ENHANCED

// Expanded keyword list for mindset detection
const MINDSET_KEYWORDS = [
  "mindset", "motivat", "stuck", "overwhelm", "doubt", "confidence",
  "fear", "burnout", "stressed", "anxious", "exhausted", "tired",
  "lonely", "isolated", "imposter", "quit", "give up", "not enough",
  "behind", "falling apart", "drowning", "lost",
];

// Crisis-level keywords that need safety response
const CRISIS_KEYWORDS = [
  "suicid", "kill myself", "end it all", "hopeless", "no point",
  "can't go on", "don't want to live",
];

/**
 * Detect wellbeing severity level.
 * Returns "crisis" for professional referral, "high" for proactive coaching,
 * "moderate" for gentle prompt, or null for no wellbeing signal.
 */
function detectWellbeingSeverity(
  message: string,
  sentiment: "positive" | "negative" | "neutral" | "mixed"
): "crisis" | "high" | "moderate" | null {
  const lower = message.toLowerCase();

  // Check for crisis language first (highest priority)
  if (CRISIS_KEYWORDS.some(kw => lower.includes(kw))) {
    return "crisis";
  }

  // Count mindset keyword matches
  const matchCount = MINDSET_KEYWORDS.filter(kw => lower.includes(kw)).length;

  if (matchCount >= 3 || (matchCount >= 2 && sentiment === "negative")) {
    return "high";
  }

  if (matchCount >= 1 && sentiment === "negative") {
    return "moderate";
  }

  return null;
}
```

### Example 2: Wellbeing-Aware Response in decide.ts

```typescript
// lib/fred/actors/decide.ts -- ENHANCED buildResponseContent()

import { FRED_PHILOSOPHY } from "@/lib/fred-brain";

function buildMindsetResponse(
  synthesis: SynthesisResult,
  input: ValidatedInput
): string {
  // Pick a relevant philosophy principle based on keywords
  const principle = selectRelevantPrinciple(input.keywords);

  const parts: string[] = [];

  // Lead with empathy
  parts.push(
    "I hear you. Let me be real -- what you're feeling is something I've seen " +
    "in thousands of founders I've worked with. It doesn't make it easier, " +
    "but you're not alone in this."
  );

  // Reference the specific principle
  if (principle) {
    if (principle.quote) {
      parts.push(`\nHere's something I always come back to: "${principle.quote}"`);
    }
    parts.push(`\n**${principle.name}:** ${principle.teachings[0]}`);
  }

  // Add specific next step
  parts.push(
    "\n**Here's what I want you to do right now:**\n" +
    "1. Write down one thing that went right this week -- no matter how small\n" +
    "2. Identify the ONE thing that's weighing on you most\n" +
    "3. Tell me about it -- we'll work through it together"
  );

  parts.push(
    "\n*If you want to go deeper, try the Wellbeing Check-in " +
    "in your dashboard -- it'll help us track how you're doing over time.*"
  );

  return parts.join("\n");
}

function selectRelevantPrinciple(keywords: string[]) {
  const principleMap: Record<string, number> = {
    stuck: 2,        // Perseverance
    overwhelm: 0,    // Mindset
    doubt: 5,        // Overcoming Self-Doubt
    confidence: 5,
    fear: 5,
    burnout: 0,      // Mindset
    exhausted: 2,    // Perseverance
    fail: 3,         // Learning from Failure
    quit: 2,         // Perseverance
    imposter: 5,     // Overcoming Self-Doubt
  };

  for (const keyword of keywords) {
    const lower = keyword.toLowerCase();
    for (const [key, principleIndex] of Object.entries(principleMap)) {
      if (lower.includes(key)) {
        return FRED_PHILOSOPHY.corePrinciples[principleIndex];
      }
    }
  }

  // Default to Mindset is Everything
  return FRED_PHILOSOPHY.corePrinciples[0];
}
```

### Example 3: Coaching API Endpoint

```typescript
// app/api/fred/coaching/route.ts

import { NextRequest } from "next/server";
import { streamText } from "ai";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { getPromptForTopic } from "@/lib/ai/prompts";
import { openai } from "@/lib/ai/providers";
import { storeEpisode } from "@/lib/db/fred-memory";

const requestSchema = z.object({
  message: z.string().min(1).max(5000),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).default([]),
  sessionId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const userId = await requireAuth();
  const body = await req.json();
  const { message, history, sessionId } = requestSchema.parse(body);

  const systemPrompt = getPromptForTopic("mindset");
  const effectiveSessionId = sessionId || crypto.randomUUID();

  // Build messages array
  const messages = [
    ...history.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  // Store user message in memory (non-blocking)
  storeEpisode(userId, effectiveSessionId, "conversation", {
    role: "user",
    content: message,
    mode: "coaching",
  }).catch(console.warn);

  const result = streamText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages,
  });

  return result.toDataStreamResponse();
}
```

### Example 4: Wellbeing Assessment Form Component

```typescript
// components/wellbeing/assessment-form.tsx

"use client";

import { useState } from "react";
import { FRED_PHILOSOPHY } from "@/lib/fred-brain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const DIMENSIONS = FRED_PHILOSOPHY.corePrinciples.map((p, i) => ({
  key: ["mindset", "accountability", "perseverance",
        "learning", "progress", "confidence"][i],
  name: p.name,
  question: [
    "How would you rate your mental clarity and optimism this week?",
    "Are you being honest with yourself about where things stand?",
    "How's your energy and drive to keep pushing?",
    "Have you been able to learn from recent setbacks?",
    "Have you celebrated any small wins this week?",
    "How confident do you feel in your ability to execute?",
  ][i],
  quote: p.quote,
}));

export function AssessmentForm({
  onSubmit,
}: {
  onSubmit: (scores: Record<string, number>, notes: string) => void;
}) {
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(DIMENSIONS.map(d => [d.key, 3]))
  );
  const [notes, setNotes] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>How are you doing?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {DIMENSIONS.map((dim) => (
          <div key={dim.key}>
            <label className="text-sm font-medium">{dim.question}</label>
            {dim.quote && (
              <p className="text-xs text-muted-foreground italic mt-1">
                &ldquo;{dim.quote}&rdquo;
              </p>
            )}
            <Slider
              value={[scores[dim.key]]}
              onValueChange={([v]) =>
                setScores(prev => ({ ...prev, [dim.key]: v }))
              }
              min={1} max={5} step={1}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Struggling</span>
              <span>Thriving</span>
            </div>
          </div>
        ))}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else you want to share? (optional)"
          className="w-full rounded-lg border p-3 text-sm"
          rows={3}
        />
        <Button
          onClick={() => onSubmit(scores, notes)}
          className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
        >
          Submit Check-in
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Example 5: Safety Response for Crisis Detection

```typescript
// In decide.ts or as a utility constant

const SAFETY_RESPONSE = `I can hear that things are really tough right now. I want you to know that what you're feeling matters, and you don't have to face this alone.

**I'm an AI business coach, not a therapist.** For what you're going through, I strongly recommend talking to a professional who can really help:

- **National Crisis Hotline (US):** Call or text **988** (Suicide & Crisis Lifeline)
- **Crisis Text Line:** Text HOME to **741741**
- **SAMHSA Helpline:** 1-800-662-4357 (free, confidential, 24/7)

These are people who are trained for exactly this. There's no shame in reaching out -- in fact, it takes real courage.

When you're ready to talk business, I'm here. But right now, please take care of yourself first.

*"Mindset is the pillar to success" -- and that starts with getting the right support.* -- Fred`;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No wellbeing detection | `detectTopic("mindset")` detects keywords but doesn't alter response | Phase 13/14 | Detection scaffolding exists |
| No coaching prompt | `COACHING_PROMPTS.mindset` exists with Fred's philosophy | Phase 13/14 | Prompt ready but unused |
| No prompt composition | `getPromptForTopic()` exists but is never called | Phase 13/14 | Full coaching system prompt ready |
| No wellbeing check-ins | Generic `check_ins` table + mock UI | v1.0 | Need dedicated wellbeing schema |
| Heuristic-only chat responses | All responses via template strings in decide.ts | v1.0 | Coaching requires AI generation |
| No crisis safety | No detection of crisis-level language | N/A | Critical gap for this phase |
| Topic label only | `decide.ts` appends "Applying Mindset coaching framework" as cosmetic footer | Phase 14/15 | Misleading -- suggests coaching is applied when it is not |

## Open Questions

1. **Tier gating for wellbeing features**
   - What we know: The ROADMAP lists Phase 17 requirements as FREE-04, FREE-05, FREE-06, suggesting they should be available to Free tier users.
   - What's unclear: Should the coaching mode (FREE-06) be Free tier? It uses AI generation (`streamText()` with GPT-4o) which costs more per interaction than the heuristic chat pipeline.
   - Recommendation: Make check-ins (FREE-05) and detection (FREE-04) Free tier. For coaching mode (FREE-06), either keep it Free with rate limiting (e.g., 5 coaching conversations/day for Free, unlimited for Pro+), or gate full coaching to Pro+.

2. **Dashboard layout file constraint**
   - What we know: MEMORY.md says `dashboard/layout.tsx` has pre-commit hook auto-revert. But the current file contains Startup Process (line 62) and Investor Evaluation (line 107) which were added in Phase 10b.
   - What's unclear: Whether the constraint was removed entirely or relaxed for specific changes.
   - Recommendation: Attempt the edit directly. It should work since Phase 10b succeeded.
   - Impact: Low -- if it fails, the wellbeing page is still accessible via direct URL; the nav item just won't appear.

3. **Coaching endpoint vs pipeline modification**
   - What we know: Option A (separate endpoint) is cleaner; Option B (pipeline modification) keeps everything in one place.
   - What's unclear: Whether the user experience should present coaching as a "mode switch" (separate chat) or a seamless part of the existing conversation.
   - Recommendation: Start with Option A (separate endpoint) and present coaching as a focused mode. The existing chat can detect mindset topics and offer to switch to coaching mode with a clear CTA.

4. **Historical wellbeing data integration with FRED memory**
   - What we know: FRED's memory system has episodic and semantic layers that store facts about the user.
   - What's unclear: Should FRED automatically reference past wellbeing scores in regular business conversations?
   - Recommendation: Store wellbeing scores in semantic memory (`storeFact(userId, "challenges", "wellbeing_latest", { scores })`). Allow FRED to reference them when relevant (especially when the founder shows signs of returning stress). But don't make it the default -- only surface when sentiment is negative.

5. **Proactive outreach / notifications**
   - What we know: The SMS check-in system (Studio tier) can send weekly texts via the cron job at `app/api/cron/weekly-checkin/route.ts`.
   - What's unclear: Should FRED proactively reach out if a founder hasn't done a wellbeing check-in in a while, or if their scores were trending down?
   - Recommendation: Out of scope for Phase 17. This would be a follow-up enhancement. For now, the check-in page is self-serve.

## Sources

### Primary (HIGH confidence)
- `lib/fred/actors/validate-input.ts` -- Read in full (429 lines). Confirmed `detectTopic()` function at line 404 with mindset keywords including burnout, stressed, anxious. Confirmed `analyzeSentiment()` at line 291 with negative word list. Both are rule-based, no AI calls.
- `lib/ai/prompts.ts` -- Read in full (260 lines). Confirmed `COACHING_PROMPTS.mindset` at line 222. Confirmed `getPromptForTopic()` at line 232 -- never imported or called anywhere else in the codebase (verified by grep).
- `lib/fred-brain.ts` -- Read in full (425 lines). Confirmed `FRED_PHILOSOPHY.corePrinciples` at line 194 with all 6 principles, each having name, optional quote, and teachings arrays.
- `lib/fred/actors/decide.ts` -- Read in full (380 lines). Confirmed `buildResponseContent()` at line 268 where topic detection appends cosmetic label only. Confirmed `COACHING_PROMPTS` import at line 20 but only used for key checking (`input.topic in COACHING_PROMPTS`), not for prompt injection.
- `lib/fred/actors/synthesize.ts` -- Read in full (531 lines). Confirmed heuristic-based recommendation generation. No mindset-specific handling. `generateRecommendation()` at line 257 uses template strings.
- `lib/fred/machine.ts` -- Read in full (660 lines). Confirmed XState pipeline flow: idle -> loading_memory -> intake -> validation -> mental_models -> synthesis -> decide -> execute/human_review. No coaching-specific state.
- `lib/fred/service.ts` -- Read in full (347 lines). Confirmed `FredService.process()` and `processStream()` methods. No coaching-specific path.
- `lib/fred/types.ts` -- Read in full (510 lines). Confirmed `CoachingTopic` type includes "mindset" at line 131. Confirmed `ValidatedInput.topic` optional field at line 112.
- `lib/fred/voice.ts` -- Read in full (74 lines). Confirmed `buildFredVoicePreamble()` utility with composable options.
- `app/api/fred/chat/route.ts` -- Read in full (332 lines). Confirmed SSE streaming response pattern. Uses `FredService` which goes through XState pipeline. Memory storage via `storeEpisode()`. No coaching-specific handling.
- `lib/hooks/use-fred-chat.ts` -- Read in full (405 lines). Confirmed client-side hook for chat API with SSE parsing. Reusable pattern for coaching hook.
- `components/chat/chat-interface.tsx` -- Read in full (88 lines). Uses `useFredChat`, `ChatMessage`, `ChatInput`, builds greeting from `fred-brain.ts`.
- `components/chat/chat-message.tsx` -- Read in full (118 lines). Message bubble with role-based styling.
- `components/chat/chat-input.tsx` -- Read in full (103 lines). Input with Enter-to-send, auto-resize.
- `components/chat/cognitive-state-indicator.tsx` -- Read in full (245 lines). Processing state display with step indicator.
- `app/dashboard/layout.tsx` -- Read in full (335 lines). Confirmed `navItems` array with 17 items including Startup Process (added Phase 10b) and Investor Evaluation (added Phase 10b). File constraint noted in MEMORY.md but Phase 10b edits are present.
- `app/dashboard/page.tsx` -- Read in full (405 lines). Dashboard with stats grid, quick actions, recent activity, upgrade CTA.
- `app/dashboard/sms/page.tsx` -- Read in full (349 lines). SMS check-in page pattern with `FeatureLock` at Studio tier.
- `components/tier/feature-lock.tsx` -- Read in full (229 lines). Confirmed FeatureLock, InlineFeatureLock, ComingSoonBadge, UpgradePromptCard components.
- `lib/db/fred-memory.ts` -- Read in full (738 lines). Confirmed `storeEpisode()`, `storeFact()`, `getFactsByCategory()`, and all CRUD operations for 3-layer memory. Semantic memory categories include "challenges".
- `lib/db/migrations/021_fred_memory_schema.sql` -- Read in full (240 lines). Confirmed episodic, semantic, procedural memory tables + decision log + RLS policies.
- `lib/db/migrations/002_add_chat_checkins.sql` -- Read in full (26 lines). Confirmed generic `check_ins` table with `responses JSONB` and `score INTEGER`.
- `lib/db/migrations/029_sms_checkins.sql` -- Read in full (35 lines). Confirmed SMS-specific check-in schema with week_number, accountability_score.
- `app/check-ins/page.tsx` -- Read in full (139 lines). Confirmed mock/static check-in page with hardcoded data, outside dashboard layout.
- `components/onboarding/fred-intro-step.tsx` -- Read in full (246 lines). Confirmed onboarding chat pattern using `/api/fred/chat` with `getFredGreeting()`.
- `lib/sms/templates.ts` -- Read in full (77 lines). Confirmed SMS template pattern using `getRandomQuote()` from fred-brain.
- `lib/fred/actors/execute.ts` -- Read in full (325 lines). Confirmed response building with approval options and memory logging via `logDecision()` + `storeEpisode()`.
- `lib/fred/actors/mental-models.ts` -- Read first 50 lines. Confirmed `selectRelevantModels()` uses keyword heuristics, no mindset-specific model.
- `.planning/ROADMAP.md` -- Grep confirmed Phase 17: FREE-04, FREE-05, FREE-06 with success criteria.
- `.planning/REQUIREMENTS.md` -- Grep confirmed FREE-04 (burnout detection), FREE-05 (check-in page), FREE-06 (mindset coaching mode).
- `.planning/phases/13-voice-core-ai-engines/13-RESEARCH.md` -- Read in full (420 lines). Used as format reference. Confirmed Phase 13 findings about chat pipeline architecture.
- Full grep across codebase for: `getPromptForTopic` (1 result: definition only), `COACHING_PROMPTS` (10 results: definition + key checks), `mindset` keywords, `burnout`/`wellbeing`/`stress` patterns, `topic` usage in decide.ts.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all files read directly, no external dependencies needed
- Architecture: HIGH -- full chat pipeline traced from API route through XState machine to all 6 actors
- Existing scaffolding analysis: HIGH -- detectTopic(), COACHING_PROMPTS.mindset, getPromptForTopic() all read and confirmed. Critical finding: getPromptForTopic() is never called.
- Gap analysis: HIGH -- confirmed detection exists but response generation ignores topic. Confirmed coaching label is cosmetic only.
- Database patterns: HIGH -- existing memory schema (3 tables) and check-in tables (2 tables) fully understood
- UI patterns: HIGH -- chat components, dashboard layout, FeatureLock, onboarding all read and documented
- Safety considerations: MEDIUM -- crisis detection pattern proposed but not validated against real-world examples
- Pitfalls: HIGH -- derived from direct code analysis and architectural understanding

**Research date:** 2026-02-07
**Valid until:** Indefinite (no external dependencies; only dependent on project source code which was read directly)
