# Phase 18: Intake Snapshot & Strategy Reframing - Research

**Researched:** 2026-02-07
**Domain:** Onboarding enrichment, profile auto-generation, snapshot display, 9-step strategy reframing UI
**Confidence:** HIGH

## Summary

Phase 18 addresses four requirements (FREE-07 through FREE-10) that close the gap between what the marketing site promises ("Founder Intake Snapshot" and "Strategy & execution reframing" listed in `TIER_FEATURES[UserTier.FREE]` in `lib/constants.ts`) and what the app actually delivers. Today, the onboarding questionnaire collects only 3 data points (startup name, stage, main challenge), there is no auto-enrichment of founder profiles from conversations, no viewable founder snapshot document, and the existing 9-step Startup Process wizard is a generic form tool without Fred's dedicated strategy reframing perspective.

The investigation reveals that the building blocks for all four requirements already exist in the codebase -- the onboarding flow, the profiles table, FRED's three-layer memory system, the strategy document generation pipeline, and the 9-step Startup Process wizard -- but they are not connected in the way required.

**Key findings:**

1. **Onboarding captures too little (FREE-07):** The `StartupInfo` interface in `lib/hooks/use-onboarding.ts` has `industry` and `goals` fields defined but they are never collected in the UI. The `profiles` table has `stage` and `challenges` columns but no columns for industry, revenue, team size, or funding history. The onboarding flow (`components/onboarding/startup-info-step.tsx`) only collects name, description, stage, and mainChallenge.

2. **No auto-enrichment from conversations (FREE-08):** The FRED chat API stores conversation episodes in `fred_episodic_memory` and the semantic memory system (`fred_semantic_memory`) has categories like `startup_facts`, `team_info`, `metrics`, `goals`, `challenges` that are perfect for storing extracted profile data. However, there is no extraction pipeline -- conversations are stored as raw episodes but no post-processing step extracts structured facts from them.

3. **No snapshot document on dashboard (FREE-09):** There is no founder profile page or snapshot view anywhere in the dashboard. The settings page (`app/dashboard/settings/page.tsx`) only shows name, email, and company name. The profiles table stores minimal data. There is no aggregation of semantic memory into a viewable document.

4. **Strategy Reframing lacks dedicated UI (FREE-10):** The 9-step Startup Process wizard (`app/dashboard/startup-process/page.tsx`) exists and is functional, but it operates as a generic form+validation tool. It stores data in localStorage (not the database `startup_processes` table). It does not apply Fred's strategy reframing methodology -- it validates step data through a general `/api/fred/analyze` call but does not use the `COACHING_PROMPTS.strategy` prompt, does not reference the `strategy` coaching mode, and does not provide the "reframing" interaction pattern where Fred challenges and restructures the founder's thinking.

## Standard Stack

No new external libraries are needed. This phase builds on existing infrastructure.

### Core (already in project)
| Library | Purpose | Why Relevant |
|---------|---------|--------------|
| `lib/hooks/use-onboarding.ts` | Onboarding state management | Extend StartupInfo interface, add new fields |
| `components/onboarding/startup-info-step.tsx` | Onboarding UI | Add industry, revenue, team size, funding history fields |
| `lib/db/fred-memory.ts` | FRED memory CRUD | storeFact/getFact for auto-enrichment |
| `lib/ai/prompts.ts` | System prompts, coaching prompts | COACHING_PROMPTS.strategy for reframing |
| `lib/fred-brain.ts` | Fred Cary knowledge base | 9-step framework definition |
| `lib/fred/strategy/` | Strategy document generation | Reusable generator/templates for snapshot |
| Vercel AI SDK 6 | AI generation | generateObject/generateText for extraction + reframing |
| Zod | Schema validation | Profile extraction schema |
| `components/startup-process/` | 9-step wizard UI | Extend for strategy reframing mode |

### Database Tables (already exist)
| Table | Purpose | Phase 18 Relevance |
|-------|---------|-------------------|
| `profiles` | User profile data | Add columns for industry, revenue, team_size, funding_history |
| `fred_semantic_memory` | Structured facts per user | Auto-enrichment target (category: startup_facts, team_info, metrics, etc.) |
| `fred_episodic_memory` | Conversation history | Source for auto-enrichment extraction |
| `startup_processes` | 9-step process state | Wire up from localStorage to DB; add reframing metadata |
| `strategy_documents` | Generated strategy docs | Could store snapshot documents |

## Architecture Patterns

### Requirement 1 (FREE-07): Enriched Onboarding Questionnaire

#### Current State

The onboarding flow has 4 steps: Welcome -> Startup Info -> Fred Intro Chat -> Complete.

**`StartupInfo` type** (`lib/hooks/use-onboarding.ts` line 16-23):
```typescript
export interface StartupInfo {
  name?: string;
  stage?: "idea" | "mvp" | "pre-seed" | "seed" | "series-a";
  industry?: string;        // <-- DEFINED but never collected in UI
  description?: string;
  mainChallenge?: string;
  goals?: string[];          // <-- DEFINED but never collected in UI
}
```

**Startup Info Step** (`components/onboarding/startup-info-step.tsx`):
The step collects data in 3 sub-steps:
1. "name" sub-step: startup name + brief description (text inputs)
2. "stage" sub-step: startup stage (radio buttons from `STARTUP_STAGES` constant)
3. "challenge" sub-step: main challenge (button grid from `FOUNDER_CHALLENGES` constant)

Missing from collection: industry, revenue range, team size, funding history.

**Profiles table** (`lib/db/migrations/032_profiles_table_trigger.sql`):
```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  stage TEXT,
  challenges JSONB DEFAULT '[]',
  teammate_emails JSONB DEFAULT '[]',
  tier INTEGER DEFAULT 0,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id)
);
```

No columns for: industry, revenue, team_size, funding_history, description, goals.

**Onboarding completion sync** (`lib/hooks/use-onboarding.ts` line 42-55):
```typescript
async function syncCompletionToDb(state: OnboardingState) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({
      onboarding_completed: true,
      stage: state.startupInfo.stage || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
}
```

Only syncs `stage` to the database. No other startup info fields are persisted.

#### Required Changes

1. **Add columns to profiles table** -- New migration adding: `industry TEXT`, `revenue_range TEXT`, `team_size TEXT`, `funding_history JSONB`, `description TEXT`, `goals JSONB`
2. **Extend StartupInfo interface** -- Add `revenueRange`, `teamSize`, `fundingHistory` fields
3. **Add sub-steps to startup-info-step.tsx** -- After "challenge", add "industry" (text input or select), "team & revenue" (team size select + revenue range select), "funding history" (optional multi-field: raised before? how much? from whom?)
4. **Extend syncCompletionToDb** -- Persist all new fields to the profiles table
5. **Update `STARTUP_STAGES` and add new constants** -- Add `REVENUE_RANGES`, `TEAM_SIZES`, `INDUSTRIES`, `FUNDING_STAGES` constants to `lib/constants.ts`

#### Design Considerations

The onboarding flow must remain skippable (the "Skip for now" button exists). New fields should be optional so the flow does not become a blocker. The recommended approach is to add 1-2 additional sub-steps within the existing "startup-info" step, keeping the total onboarding at 4 main steps.

The `ProgressIndicator` component (`components/onboarding/progress-indicator.tsx`) shows 4 top-level steps and does not need to change -- the additional sub-steps are internal to the "startup-info" step (the existing startup-info step already has 3 internal sub-steps: name, stage, challenge).

### Requirement 2 (FREE-08): Auto-Enrichment from Conversations

#### Current State

The FRED chat pipeline (`app/api/fred/chat/route.ts`) stores both user and assistant messages in episodic memory:

```typescript
// Store in episodic memory if requested (line 143-158)
if (storeInMemory) {
  await storeEpisode(userId, effectiveSessionId, "conversation", {
    role: "user",
    content: message,
    context,
  });
  await storeEpisode(userId, effectiveSessionId, "conversation", {
    role: "assistant",
    content: result.response.content,
    action: result.response.action,
    confidence: result.response.confidence,
  });
}
```

The semantic memory system (`lib/db/fred-memory.ts`) has a `storeFact()` function that upserts facts with category/key/value:
```typescript
export async function storeFact(
  userId: string,
  category: SemanticCategory,
  key: string,
  value: Record<string, unknown>,
  options: { embedding?: number[]; confidence?: number; source?: string; } = {}
): Promise<SemanticMemory>
```

Available categories: `startup_facts`, `user_preferences`, `market_knowledge`, `team_info`, `investor_info`, `product_details`, `metrics`, `goals`, `challenges`, `decisions`.

**Gap:** No extraction pipeline exists. Conversations are stored as raw text in episodic memory, but no process converts them into structured semantic memory facts.

#### Required Architecture

A two-phase approach:

**Phase A -- Post-conversation extraction (immediate):**
After each chat response is generated, run a lightweight AI extraction step that identifies any new facts mentioned in the conversation exchange. This runs asynchronously (fire-and-forget) so it does not block the chat response.

```
User message + Assistant response
       |
       v
  AI extraction (generateObject with Zod schema)
       |
       v
  storeFact() for each extracted fact
```

The extraction prompt would use a Zod schema like:
```typescript
const ExtractedFactsSchema = z.object({
  facts: z.array(z.object({
    category: z.enum([
      "startup_facts", "team_info", "metrics", "goals",
      "challenges", "investor_info", "product_details", "market_knowledge"
    ]),
    key: z.string().describe("Unique identifier, e.g., 'revenue_monthly', 'team_size', 'industry'"),
    value: z.record(z.unknown()).describe("Structured value for the fact"),
    confidence: z.number().min(0).max(1).describe("How confident the extraction is"),
  })),
});
```

**Phase B -- Periodic profile consolidation (background):**
A background task (could be triggered by login, or by a cron-like mechanism) that reads all semantic memory facts for a user and consolidates them into an updated profile snapshot. This is the bridge between FREE-08 and FREE-09.

#### Integration Point

The extraction step should be added in `app/api/fred/chat/route.ts` after the memory storage block (line 143-158), as a fire-and-forget async call:

```typescript
// After storeInMemory block
extractAndStoreFacts(userId, effectiveSessionId, message, result.response.content)
  .catch(err => console.warn("[FRED Chat] Fact extraction failed:", err));
```

This pattern is consistent with the existing fire-and-forget agent dispatch pattern used elsewhere in the codebase.

### Requirement 3 (FREE-09): Viewable Snapshot Document

#### Current State

There is no founder profile or snapshot view in the dashboard. The settings page (`app/dashboard/settings/page.tsx`) shows only name, email, and company name. The dashboard sidebar (`app/dashboard/layout.tsx`) does not have a "Profile" or "Snapshot" navigation item.

The strategy document system (`lib/fred/strategy/`) provides a reusable pattern for generating and displaying documents with sections, but it is Pro-tier gated and designed for strategy documents, not profile snapshots.

#### Required Architecture

**New dashboard page:** `app/dashboard/snapshot/page.tsx`

**Data sources for the snapshot:**
1. `profiles` table -- name, email, stage, industry, revenue, team_size, funding_history, challenges
2. `fred_semantic_memory` -- all facts for the user, grouped by category
3. Onboarding data (localStorage `sahara-onboarding` key) -- startup info

**Snapshot structure:**
The snapshot should be a read-only document view showing:
- Founder & Company Overview (name, company, stage, industry)
- Team (size, roles if known)
- Financial Overview (revenue range, funding history)
- Key Challenges (from onboarding + extracted from conversations)
- Goals (from onboarding + extracted)
- Product Details (extracted from conversations)
- Market Knowledge (extracted from conversations)
- FRED's Understanding (summary of what FRED knows about this founder, generated from semantic memory)

**Generation approach:**
The snapshot can be generated in two ways:
1. **Static aggregation** -- Simply query profiles + semantic memory and render as structured sections. No AI call needed.
2. **AI-generated narrative** -- Use `generateText()` with Fred's voice to produce a narrative summary. More engaging but adds latency and cost.

Recommendation: Use static aggregation for the main sections (always fast, always up-to-date) with an optional "FRED's Summary" section generated on demand via AI.

**Dashboard navigation:**
Add a new nav item to `app/dashboard/layout.tsx` in the navItems array. Since this is a Free-tier feature, it should appear near the top of the navigation, before the Pro-tier items. The exact position should be after "Monitoring" and before "Positioning":

```typescript
{
  name: "Founder Snapshot",
  href: "/dashboard/snapshot",
  icon: <PersonIcon className="h-4 w-4" />,
  badge: "Free",
},
```

Note: `app/dashboard/layout.tsx` is listed in the file modification constraints (pre-commit hooks auto-revert changes). The workaround is to create an adapter route or wrapper file. However, the constraint documentation says "some component files" -- the layout may or may not be locked. If it is locked, the nav item can be added via a different mechanism (e.g., a constants-driven nav array in `lib/constants.ts` via `DASHBOARD_NAV`).

### Requirement 4 (FREE-10): Strategy & Execution Reframing UI

#### Current State

**The 9-Step Startup Process wizard** exists at `app/dashboard/startup-process/page.tsx` and provides:
- A gated 9-step wizard UI (step-by-step progression)
- Form inputs for each step (problem, customer, founder edge, solution, validation, GTM, execution, pilot, scale decision)
- AI validation via `/api/fred/analyze` endpoint
- LocalStorage persistence (NOT database persistence)
- Overview + Wizard view modes
- Progress tracking

**What it lacks for "Strategy Reframing":**
1. No Fred voice in the step guidance -- the step descriptions and key questions are generic
2. No "reframing" interaction -- validation just returns pass/fail/needs_work, it does not challenge the founder's assumptions or offer alternative perspectives
3. No coaching mode -- the wizard does not use `COACHING_PROMPTS.strategy` from `lib/ai/prompts.ts`
4. Data stays in localStorage -- not persisted to the `startup_processes` database table
5. No connection to the founder's profile -- the wizard does not know the founder's industry, stage, or previous conversations

**The 9-step framework** is defined in both:
- `lib/ai/prompts.ts` (FRED_CAREY_SYSTEM_PROMPT lines 128-138): "The 9-Step Startup Process (Idea -> Traction)" with all 9 steps and the gating principle
- `types/startup-process.ts`: Full type definitions including `STEP_TITLES`, `STEP_DESCRIPTIONS`, `STEP_KEY_QUESTIONS`
- `lib/db/migrations/016_startup_process.sql`: Full database schema with per-step columns

**The coaching prompt** in `lib/ai/prompts.ts` (line 205-212):
```typescript
strategy: `Help with strategic planning using the 9-Step Startup Process:
- Which step are they actually on? (Don't let them skip ahead)
- Current challenges and blockers
- What validation is needed before proceeding?
- Resource allocation priorities
- Clear milestones and next actions

Remember: Upstream truth before downstream optimization.`,
```

This prompt exists but is NEVER USED by the Startup Process page. It is only available via `getPromptForTopic("strategy")`.

**The startup process wizard components** (`components/startup-process/`):
- `startup-process-wizard.tsx` (524 lines) -- Main wizard with step indicator, form area, sidebar with key questions and validation feedback
- `step-form.tsx` (781 lines) -- 9 individual step forms (Step1Form through Step9Form) with typed inputs
- `step-card.tsx` -- Individual step status card
- `process-overview.tsx` -- Grid view of all 9 steps
- `validation-feedback.tsx` -- Displays validation results

The current validation flow (in `app/dashboard/startup-process/page.tsx`):
```typescript
async function validateStep(stepNumber, data) {
  const response = await fetch("/api/fred/analyze", {
    method: "POST",
    body: JSON.stringify({
      type: "step_validation",
      context: {
        stepNumber,
        stepTitle: STEP_TITLES[stepNumber],
        stepDescription: STEP_DESCRIPTIONS[stepNumber],
        keyQuestions: STEP_KEY_QUESTIONS[stepNumber],
        userResponses: data,
      },
    }),
  });
  // Returns: { status, feedback, suggestions, blockerReasons }
}
```

This goes through the generic `/api/fred/analyze` endpoint which uses the FredService XState pipeline. It does NOT use `COACHING_PROMPTS.strategy` or any strategy-specific prompt.

#### Required Architecture

The Strategy Reframing UI should transform the existing 9-step wizard from a form tool into an interactive coaching experience. Two approaches:

**Approach A -- Enhance the existing wizard:**
Add a "Reframe with FRED" button to each step that opens a chat-like interface where Fred applies his strategy coaching methodology. Instead of just validating (pass/fail), Fred challenges assumptions, asks probing questions, and offers alternative framings. The validation API call would use `COACHING_PROMPTS.strategy` as the system prompt.

**Approach B -- Dedicated reframing page:**
Create a new page (`app/dashboard/strategy-reframing/page.tsx`) that is a chat-first experience where Fred guides the founder through each step conversationally, with form fields auto-populated from the conversation.

**Recommendation: Approach A+** -- Enhance the existing wizard AND add a prominent "Reframe" interaction at each step. The wizard form structure is good; what's missing is Fred's coaching voice and the reframing interaction pattern. Specifically:

1. **Step-level coaching panel** -- Add a collapsible "Ask FRED" panel to each step in the wizard that uses `COACHING_PROMPTS.strategy` and knows the current step context
2. **Reframing validation** -- Replace the generic `/api/fred/analyze` validation with a dedicated `/api/fred/strategy-reframe` endpoint that:
   - Knows which step the founder is on
   - Applies the 9-step gating principle ("do NOT advance until current step is validated")
   - Uses Fred's voice (imports from `lib/fred-brain.ts`)
   - Provides specific, actionable reframing (not just "needs work")
   - References the founder's profile data (industry, stage) for context
3. **Database persistence** -- Wire the wizard to persist to `startup_processes` table instead of only localStorage
4. **Profile integration** -- Pre-populate known context from the profiles table and semantic memory

## File-by-File Change Map

### FREE-07: Enriched Onboarding

| File | Change Type | Complexity |
|------|-------------|------------|
| `lib/db/migrations/036_enrich_profiles.sql` (NEW) | Add columns to profiles table | Low |
| `lib/hooks/use-onboarding.ts` | Extend StartupInfo interface, extend syncCompletionToDb | Low |
| `components/onboarding/startup-info-step.tsx` | Add industry, team, revenue, funding sub-steps | Medium |
| `lib/constants.ts` | Add REVENUE_RANGES, TEAM_SIZES, INDUSTRIES, FUNDING_STAGES constants | Low |

### FREE-08: Auto-Enrichment

| File | Change Type | Complexity |
|------|-------------|------------|
| `lib/fred/extract-facts.ts` (NEW) | AI fact extraction from conversations | Medium |
| `app/api/fred/chat/route.ts` | Add fire-and-forget extraction call after memory storage | Low |
| `lib/db/fred-memory.ts` | No changes needed (storeFact already exists) | None |

### FREE-09: Snapshot Document

| File | Change Type | Complexity |
|------|-------------|------------|
| `app/dashboard/snapshot/page.tsx` (NEW) | Founder snapshot page | Medium |
| `components/snapshot/FounderSnapshot.tsx` (NEW) | Snapshot display component | Medium |
| `app/api/fred/snapshot/route.ts` (NEW) | API to aggregate profile + semantic memory | Medium |
| `app/dashboard/layout.tsx` | Add nav item (if not locked by pre-commit hook) | Low |
| `lib/constants.ts` | Add nav entry to DASHBOARD_NAV | Low |

### FREE-10: Strategy Reframing

| File | Change Type | Complexity |
|------|-------------|------------|
| `app/api/fred/strategy-reframe/route.ts` (NEW) | Dedicated reframing endpoint using coaching prompts | Medium |
| `app/dashboard/startup-process/page.tsx` | Wire to DB instead of localStorage; integrate reframing | Medium |
| `components/startup-process/startup-process-wizard.tsx` | Add "Ask FRED" coaching panel per step | Medium |
| `components/startup-process/reframe-panel.tsx` (NEW) | Chat-like coaching panel component | Medium |
| `lib/fred/strategy-reframe.ts` (NEW) | Reframing engine using COACHING_PROMPTS.strategy | Medium |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured profile storage | Custom profile JSON column | Separate columns in profiles table + semantic memory | Queryable, type-safe, works with existing RLS policies |
| Fact extraction AI call | Custom prompt construction | `generateObject()` with Zod schema + `lib/fred-brain.ts` imports | Consistent with project pattern (Strategy, Reality Lens all use this) |
| Document rendering | Custom markdown renderer | Reuse patterns from `DocumentPreview` in `components/strategy/` | Already has markdown rendering, export, etc. |
| Strategy coaching prompts | Inline system prompts | `COACHING_PROMPTS.strategy` from `lib/ai/prompts.ts` | Already written and tested; uses Fred's 9-step methodology |
| Step validation | Generic analyze endpoint | Dedicated reframe endpoint with step-specific context | Generic endpoint cannot apply gating principle or step-specific coaching |
| Profile data aggregation | Complex client-side joins | Server-side API route that queries profiles + semantic memory | Cleaner, faster, respects RLS |

## Common Pitfalls

### Pitfall 1: Making Onboarding Too Long
**What goes wrong:** Adding 5+ new required fields to onboarding causes drop-off. Founders skip the entire flow.
**Why it happens:** Every additional field adds friction. The current flow is already 4 steps with a skip option.
**How to avoid:** Make all new fields optional. Add them as 1-2 additional sub-steps within the existing "startup-info" step (which already has 3 internal sub-steps). Group related fields (team + revenue on one screen, industry on another). Show a progress bar within the sub-steps.
**Warning signs:** Increased skip rate, decreased onboarding completion rate.

### Pitfall 2: Extraction Pipeline Blocking Chat Responses
**What goes wrong:** The fact extraction AI call adds 2-5 seconds of latency to every chat response.
**Why it happens:** Running extraction synchronously before returning the chat response.
**How to avoid:** Fire-and-forget pattern. The extraction call must be asynchronous and must not block the response. Use the same pattern as agent dispatch: `extractFacts(...).catch(err => console.warn(...))`.
**Warning signs:** Chat response latency increases after adding extraction.

### Pitfall 3: Token Cost Explosion from Extraction
**What goes wrong:** Running a full GPT-4o extraction call on every single message, including "hi" and "thanks".
**Why it happens:** No filtering before extraction.
**How to avoid:** Add a simple heuristic gate: only run extraction on messages longer than ~50 characters and only on assistant responses that contain substantive content (not greetings or confirmations). Use `gpt-4o-mini` for extraction since it only needs to identify structured facts, not generate creative content.
**Warning signs:** AI cost spikes; extraction on trivial messages.

### Pitfall 4: Stale Snapshot Data
**What goes wrong:** The snapshot page shows outdated information because it reads from the profiles table which was only updated at onboarding time.
**Why it happens:** Onboarding data is static; auto-enrichment updates semantic memory but not the profiles table.
**How to avoid:** The snapshot page should aggregate from BOTH the profiles table AND semantic memory. Semantic memory facts should be the source of truth for evolving data (metrics, challenges, goals), while the profiles table holds the baseline from onboarding.
**Warning signs:** User tells FRED about a revenue milestone in chat, but the snapshot still shows the old revenue range.

### Pitfall 5: Reframing Feels Like Validation (Not Coaching)
**What goes wrong:** The reframing feature just returns "pass/fail" with slightly better feedback. Founders don't experience a coaching interaction.
**Why it happens:** Using the same API pattern as validation (single request/response) instead of a conversational pattern.
**How to avoid:** The reframing panel should be a multi-turn chat-like experience, not a single "Validate" button. Fred should ask follow-up questions, challenge assumptions, and offer alternative perspectives. The UI should be a collapsible chat panel in the wizard sidebar, not a modal or separate page.
**Warning signs:** Users click "Reframe" once, read the feedback, and never engage again.

### Pitfall 6: LocalStorage / Database Conflict for Startup Process
**What goes wrong:** The wizard reads from localStorage but the new code tries to write to the database, or vice versa. Data gets out of sync.
**Why it happens:** The current wizard is 100% localStorage-based. Migration to database must handle the transition.
**How to avoid:** When the wizard loads, check for localStorage data first. If it exists and the user has no DB record, migrate it to the DB. Then switch to DB as the source of truth. Keep localStorage as a write-through cache for offline resilience if needed.
**Warning signs:** Lost data on device switch; duplicate records.

### Pitfall 7: Startup Process DB Schema Mismatch
**What goes wrong:** The TypeScript `StartupProcess` interface uses nested step data objects (Step1Data, Step2Data, etc.) while the database migration 016 uses flat columns (problem_statement, problem_who, etc.). Direct mapping fails.
**Why it happens:** The DB schema was designed before the TypeScript types, or they evolved independently.
**How to avoid:** Create an adapter layer that maps between the flat DB columns and the nested TypeScript objects. Alternatively, store step data as JSONB in the DB (simpler but less queryable). Given that the `startup_processes` table already has flat columns with specific names, build a mapper function for each step.
**Warning signs:** Data round-trip corruption; missing fields after save/load cycle.

## Code Examples

### Example 1: Extended StartupInfo Interface

```typescript
// lib/hooks/use-onboarding.ts
export interface StartupInfo {
  name?: string;
  stage?: "idea" | "mvp" | "pre-seed" | "seed" | "series-a";
  industry?: string;
  description?: string;
  mainChallenge?: string;
  goals?: string[];
  // NEW fields for Phase 18
  revenueRange?: "pre-revenue" | "0-10k" | "10k-50k" | "50k-100k" | "100k+";
  teamSize?: "solo" | "2-5" | "6-15" | "16-50" | "50+";
  fundingStage?: "bootstrapped" | "friends-family" | "pre-seed" | "seed" | "series-a+";
}
```

### Example 2: Fact Extraction Module

```typescript
// lib/fred/extract-facts.ts
import { z } from "zod";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { storeFact, type SemanticCategory } from "@/lib/db/fred-memory";

const ExtractedFactsSchema = z.object({
  facts: z.array(z.object({
    category: z.enum([
      "startup_facts", "team_info", "metrics", "goals",
      "challenges", "investor_info", "product_details", "market_knowledge"
    ]),
    key: z.string(),
    value: z.record(z.unknown()),
    confidence: z.number().min(0).max(1),
  })).describe("Facts mentioned in the conversation. Only include NEW information, not general chat."),
});

export async function extractAndStoreFacts(
  userId: string,
  sessionId: string,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  // Skip trivial messages
  if (userMessage.length < 50 && assistantResponse.length < 100) return;

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: ExtractedFactsSchema,
    prompt: `Extract any factual information about the user's startup from this conversation exchange.
Only extract concrete facts (numbers, names, dates, statuses), not opinions or generic statements.
If no new facts are present, return an empty array.

User: ${userMessage}
Assistant: ${assistantResponse}`,
  });

  for (const fact of object.facts) {
    if (fact.confidence >= 0.7) {
      await storeFact(
        userId,
        fact.category as SemanticCategory,
        fact.key,
        fact.value,
        { confidence: fact.confidence, source: `conversation:${sessionId}` }
      );
    }
  }
}
```

### Example 3: Snapshot API Route

```typescript
// app/api/fred/snapshot/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { getAllUserFacts } from "@/lib/db/fred-memory";

export async function GET() {
  const userId = await requireAuth();
  const supabase = createServiceClient();

  // Get profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  // Get all semantic memory facts
  const facts = await getAllUserFacts(userId);

  // Group facts by category
  const factsByCategory: Record<string, Array<{ key: string; value: unknown; updatedAt: Date }>> = {};
  for (const fact of facts) {
    if (!factsByCategory[fact.category]) {
      factsByCategory[fact.category] = [];
    }
    factsByCategory[fact.category].push({
      key: fact.key,
      value: fact.value,
      updatedAt: fact.updatedAt,
    });
  }

  return NextResponse.json({
    success: true,
    snapshot: {
      profile,
      facts: factsByCategory,
      lastUpdated: facts.length > 0
        ? Math.max(...facts.map(f => f.updatedAt.getTime()))
        : profile?.updated_at,
    },
  });
}
```

### Example 4: Strategy Reframing Endpoint

```typescript
// app/api/fred/strategy-reframe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { requireAuth } from "@/lib/auth";
import { getPromptForTopic } from "@/lib/ai/prompts";
import { STEP_TITLES, STEP_DESCRIPTIONS, STEP_KEY_QUESTIONS } from "@/types/startup-process";
import { getAllUserFacts } from "@/lib/db/fred-memory";
import type { StepNumber } from "@/types/startup-process";

const reframeSchema = z.object({
  stepNumber: z.number().min(1).max(9),
  stepData: z.record(z.unknown()),
  question: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const userId = await requireAuth();
  const body = await req.json();
  const { stepNumber, stepData, question } = reframeSchema.parse(body);

  // Get founder context from semantic memory
  const facts = await getAllUserFacts(userId);
  const factSummary = facts
    .slice(0, 20)
    .map(f => `${f.category}/${f.key}: ${JSON.stringify(f.value)}`)
    .join("\n");

  const systemPrompt = getPromptForTopic("strategy");
  const sn = stepNumber as StepNumber;

  const userPrompt = `The founder is on Step ${stepNumber}: ${STEP_TITLES[sn]}
Step description: ${STEP_DESCRIPTIONS[sn]}

Their current answers:
${JSON.stringify(stepData, null, 2)}

Known facts about this founder:
${factSummary || "No prior facts available."}

${question
  ? `The founder asks: "${question}"\n\nProvide a strategic reframing response.`
  : `Review their answers for this step. Challenge weak assumptions, identify gaps, and offer a reframed perspective. Be specific about what needs strengthening before they can advance.`
}`;

  const { text } = await generateText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.7,
  });

  return NextResponse.json({
    success: true,
    reframing: text,
    stepNumber,
  });
}
```

### Example 5: New Onboarding Constants

```typescript
// lib/constants.ts (additions)

export const INDUSTRIES = [
  { id: "saas", label: "SaaS / Software" },
  { id: "fintech", label: "FinTech" },
  { id: "healthtech", label: "HealthTech" },
  { id: "edtech", label: "EdTech" },
  { id: "ecommerce", label: "E-Commerce / Retail" },
  { id: "marketplace", label: "Marketplace" },
  { id: "ai-ml", label: "AI / Machine Learning" },
  { id: "hardware", label: "Hardware / IoT" },
  { id: "consumer", label: "Consumer Products" },
  { id: "other", label: "Other" },
] as const;

export const REVENUE_RANGES = [
  { id: "pre-revenue", label: "Pre-Revenue" },
  { id: "0-10k", label: "$0 - $10K MRR" },
  { id: "10k-50k", label: "$10K - $50K MRR" },
  { id: "50k-100k", label: "$50K - $100K MRR" },
  { id: "100k+", label: "$100K+ MRR" },
] as const;

export const TEAM_SIZES = [
  { id: "solo", label: "Solo Founder" },
  { id: "2-5", label: "2-5 people" },
  { id: "6-15", label: "6-15 people" },
  { id: "16-50", label: "16-50 people" },
  { id: "50+", label: "50+ people" },
] as const;

export const FUNDING_STAGES = [
  { id: "bootstrapped", label: "Bootstrapped" },
  { id: "friends-family", label: "Friends & Family" },
  { id: "pre-seed-raised", label: "Pre-Seed Raised" },
  { id: "seed-raised", label: "Seed Raised" },
  { id: "series-a+", label: "Series A+" },
] as const;
```

## State of the Art

| Current State | Target State | Gap |
|---------------|-------------|-----|
| Onboarding collects 3 fields (name, stage, challenge) | Onboarding collects 7+ fields (+ industry, revenue, team, funding) | Missing UI fields and DB columns |
| Conversations stored as raw episodes | Conversations auto-extract structured facts to semantic memory | No extraction pipeline |
| No profile/snapshot view on dashboard | Viewable snapshot aggregating profile + semantic memory | No page, no API, no nav item |
| 9-step wizard is generic form + validation | 9-step wizard with Fred's reframing coaching at each step | No coaching integration, no Fred voice, no DB persistence |
| Settings page shows name/email/company | Snapshot page shows full founder profile with enriched data | Settings too minimal; snapshot does not exist |
| Startup process data in localStorage only | Data persisted to startup_processes DB table | No DB persistence wired |
| `COACHING_PROMPTS.strategy` defined but unused | Strategy coaching prompt powers the reframing endpoint | Never imported by startup process code |

## Open Questions

1. **Should the snapshot be editable?**
   - What we know: The snapshot aggregates data from profiles table + semantic memory. Profiles table data is editable via settings.
   - What's unclear: Should founders be able to edit facts extracted from conversations? Or should they only be able to "correct" them through new conversations?
   - Recommendation: Make the snapshot read-only with a "This doesn't look right? Tell FRED" link that opens a chat to correct information. Manual edits to extracted facts would be complex and error-prone.

2. **Snapshot as document vs. dashboard widget?**
   - What we know: Success criteria says "viewable snapshot document" which implies a full page.
   - What's unclear: Should there also be a summary widget on the main dashboard page?
   - Recommendation: Full page first (the requirement). A summary widget on the dashboard overview is a nice-to-have for a later phase.

3. **Tier gating for auto-enrichment?**
   - What we know: FREE-08 says "FRED auto-generates and enriches the founder profile from ongoing conversations." This is listed as a Free tier feature.
   - What's unclear: Should extraction run for all tiers? `TIER_FEATURES[UserTier.PRO]` lists "Persistent founder memory" -- does that mean Free tier gets extraction but not persistence?
   - Recommendation: Run extraction for all tiers (it's the source for the Free-tier snapshot). The "Persistent founder memory" Pro feature likely refers to deeper/longer memory retention and cross-session context, not basic fact extraction.

4. **Strategy Reframing: separate page or integrated into existing wizard?**
   - What we know: The requirement says "dedicated UI." The existing wizard is at `/dashboard/startup-process`.
   - What's unclear: Whether "dedicated" means a separate route or a significantly enhanced version of the existing page.
   - Recommendation: Enhance the existing page with a reframing mode/panel rather than creating a duplicate page. The wizard already has the 9-step structure; adding Fred's coaching voice makes it the "dedicated UI." The alternative (separate page) would create confusion about which page to use.

5. **Database migration for startup_processes table?**
   - What we know: The `startup_processes` table exists in migration 016 but the wizard only uses localStorage.
   - What's unclear: Whether the existing table schema matches the current TypeScript types or needs updates.
   - Recommendation: The DB schema (migration 016) uses flat columns (problem_statement, problem_who, etc.) while TypeScript uses nested step data objects (Step1Data, Step2Data). An adapter layer will be needed. The flat DB schema is actually more queryable and should be kept. Build mapper functions.

## Sources

### Primary (HIGH confidence)
- `lib/hooks/use-onboarding.ts` -- Read in full (237 lines), StartupInfo interface and state management documented
- `components/onboarding/startup-info-step.tsx` -- Read in full (211 lines), 3 sub-steps documented
- `components/onboarding/welcome-step.tsx` -- Read in full (143 lines), confirmed no data collection
- `components/onboarding/fred-intro-step.tsx` -- Read in full (245 lines), chat integration documented
- `components/onboarding/complete-step.tsx` -- Read in full (166 lines), confirmed no data collection
- `components/onboarding/progress-indicator.tsx` -- Read in full (129 lines), 4-step indicator documented
- `app/onboarding/page.tsx` -- Read in full (143 lines), flow orchestration documented
- `lib/db/migrations/032_profiles_table_trigger.sql` -- Read in full (69 lines), profiles table schema documented
- `lib/db/fred-memory.ts` -- Read in full (737 lines), all CRUD operations and types documented
- `lib/db/migrations/021_fred_memory_schema.sql` -- Read in full (240 lines), three-layer memory schema documented
- `lib/ai/prompts.ts` -- Read in full (259 lines), FRED_CAREY_SYSTEM_PROMPT and COACHING_PROMPTS documented
- `lib/fred-brain.ts` -- Read in full (425 lines), all exports and 9-step framework documented
- `lib/fred/strategy/types.ts` -- Read in full (106 lines), strategy document types documented
- `lib/fred/strategy/generator.ts` -- Read in full (195 lines), document generation pipeline documented
- `lib/fred/strategy/db.ts` -- Read in full (190 lines), strategy CRUD documented
- `lib/fred/strategy/templates/index.ts` -- Read in full (27 lines), template registry documented
- `lib/fred/strategy/index.ts` -- Read in full (22 lines), module exports documented
- `app/dashboard/startup-process/page.tsx` -- Read in full (352 lines), wizard page with localStorage persistence documented
- `components/startup-process/startup-process-wizard.tsx` -- Read in full (524 lines), wizard UI and gating logic documented
- `components/startup-process/step-form.tsx` -- Read in full (781 lines), all 9 step forms documented
- `types/startup-process.ts` -- Read in full (204 lines), all types, step titles, descriptions, key questions documented
- `lib/db/migrations/016_startup_process.sql` -- Read in full (103 lines), DB schema documented
- `app/dashboard/page.tsx` -- Read in full (404 lines), dashboard overview documented
- `app/dashboard/settings/page.tsx` -- Read in full (522 lines), settings page with profile editing documented
- `app/dashboard/layout.tsx` -- Read in full (334 lines), sidebar navigation documented
- `app/dashboard/strategy/page.tsx` -- Read in full (376 lines), strategy documents page documented
- `app/api/fred/chat/route.ts` -- Read in full (331 lines), chat API with memory storage documented
- `app/api/fred/analyze/route.ts` -- Read in full (161 lines), analyze endpoint documented
- `lib/fred/service.ts` -- Read first 100 lines, XState service pattern documented
- `lib/constants.ts` -- Read in full (171 lines), tiers, features, stages, challenges documented
- `lib/db/migrations/019_diagnostic_flow.sql` -- Read in full (68 lines), diagnostic state tracking documented
- `lib/db/migrations/027_strategy_documents.sql` -- Read in full (34 lines), strategy documents table documented
- `lib/db/migrations/022_fred_procedures_seed.sql` -- Read in full (672 lines), procedural memory seed data documented
- `lib/db/migrations/023_fred_calibration_schema.sql` -- Read in full (198 lines), calibration records documented
- `.planning/ROADMAP.md` -- Phase 18 requirements and success criteria confirmed
- `.planning/REQUIREMENTS.md` -- FREE-07 through FREE-10 definitions confirmed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all files read directly, no external dependencies needed
- Architecture: HIGH -- existing patterns (strategy docs, memory system, onboarding) all understood
- Onboarding extension (FREE-07): HIGH -- full flow traced, all components and hooks read
- Auto-enrichment (FREE-08): HIGH -- memory system fully understood, integration point identified
- Snapshot document (FREE-09): HIGH -- data sources mapped, dashboard navigation understood
- Strategy reframing (FREE-10): HIGH -- wizard fully traced, coaching prompts identified, gap clearly defined
- Pitfalls: HIGH -- derived from direct code analysis of existing patterns and constraints

**Research date:** 2026-02-07
**Valid until:** Indefinite (no external dependencies; only dependent on project source code which was read directly)
