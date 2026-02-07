# Phase 18: Intake Snapshot & Strategy Reframing - Research

**Researched:** 2026-02-07
**Domain:** Enriched onboarding, auto-enrichment from conversations, founder profile snapshot, strategy reframing UI
**Confidence:** HIGH

## Phase Overview

Phase 18 enriches the founder onboarding process with additional fields, adds automatic profile enrichment from ongoing conversations, creates a viewable profile snapshot on the dashboard, and builds a dedicated Strategy & Execution Reframing UI applying Fred's 9-step framework.

### Requirements

| ID | Description | Tier |
|----|-------------|------|
| FREE-07 | Enriched onboarding questionnaire (industry, revenue, team size, funding) | Free |
| FREE-08 | Auto-enrich founder profile from ongoing FRED conversations | Free |
| FREE-09 | Dashboard profile snapshot document showing current founder profile | Free |
| FREE-10 | Strategy & Execution Reframing UI with dedicated 9-step framework | Free |

### Success Criteria

1. Enriched onboarding questionnaire captures industry, revenue, team size, and funding history
2. FRED auto-generates and enriches the founder profile from ongoing conversations over time
3. Dashboard displays a viewable snapshot document showing the current founder profile
4. Strategy & Execution Reframing has a dedicated UI applying Fred's 9-step framework

## What Exists in the Codebase

### Current Onboarding (app/onboarding/page.tsx)

The onboarding page collects minimal data:
- Full name
- Startup stage (idea, MVP, pre-seed, seed, series-a) -- from `STARTUP_STAGES` in constants.ts
- Primary challenge (product-market-fit, fundraising, team-building, etc.) -- from `FOUNDER_CHALLENGES` in constants.ts
- Short business description

This data is stored in the `profiles` table. The onboarding page is at `app/onboarding/page.tsx` as a single client component.

### Constants for Onboarding (lib/constants.ts)

```typescript
export const FOUNDER_CHALLENGES = [
  { id: "product-market-fit", label: "Product-Market Fit", icon: "Target" },
  { id: "fundraising", label: "Fundraising", icon: "DollarSign" },
  { id: "team-building", label: "Team Building", icon: "Users" },
  { id: "growth-scaling", label: "Growth & Scaling", icon: "TrendingUp" },
  { id: "unit-economics", label: "Unit Economics", icon: "BarChart3" },
  { id: "strategic-planning", label: "Strategy", icon: "Brain" },
];

export const STARTUP_STAGES = [
  { id: "idea", label: "Idea Stage", description: "Validating the concept" },
  { id: "mvp", label: "MVP", description: "Building first version" },
  { id: "pre-seed", label: "Pre-Seed", description: "Early traction" },
  { id: "seed", label: "Seed", description: "Product-market fit" },
  { id: "series-a", label: "Series A", description: "Scaling growth" },
];
```

No industry, revenue, team size, or funding history constants exist.

### Profiles Table

The `profiles` table stores onboarding data. Current known columns include user metadata fields but not industry, revenue, team_size, or funding_stage. These will need to be added via migration.

### 3-Layer Memory System (lib/db/fred-memory.ts)

The memory system provides the foundation for auto-enrichment:

- **Episodic memory** (`fred_episodic_memory`) -- stores conversation content as JSON
- **Semantic memory** (`fred_semantic_memory`) -- stores facts with categories like `startup_facts`, `user_preferences`, `market_knowledge`, `team_info`, `investor_info`, `product_details`, `metrics`, `goals`, `challenges`, `decisions`
- **Procedural memory** (`fred_procedural_memory`) -- decision frameworks

The semantic memory system already uses `storeFact(userId, category, key, value)` with upsert on `(user_id, category, key)`. This means auto-enrichment can write to semantic memory and the profile snapshot can read from it.

Key functions:
- `storeFact()` -- upsert a fact
- `getAllUserFacts(userId)` -- get all facts for profile building
- `getFactsByCategory(userId, category)` -- filtered retrieval

### 9-Step Startup Process (lib/ai/frameworks/startup-process.ts)

The complete 9-step framework is already implemented:

```typescript
export type StartupStep =
  | "problem" | "buyer" | "founder-edge" | "solution"
  | "validation" | "gtm" | "execution" | "pilot" | "scale-decision";
```

Each step has: `name`, `objective`, `questions`, `requiredOutput`, `doNotAdvanceIf`, `stepNumber`.

The framework also exports types for `StepStatus` (not_started, in_progress, validated, blocked) and `StepValidation`.

### Strategy Documents (lib/fred/strategy/)

The strategy subsystem includes:
- `lib/fred/strategy/types.ts` -- Document types, content structures
- `lib/fred/strategy/generator.ts` -- AI-powered strategy document generation
- `lib/fred/strategy/templates/` -- Template files
- `lib/fred/strategy/db.ts` -- Database operations for strategy documents
- `lib/fred/strategy/index.ts` -- Public API

Strategy documents are Pro tier features. The 9-step reframing UI is a Free tier feature that provides a lighter, guided experience.

### COACHING_PROMPTS.strategy (lib/ai/prompts.ts)

The strategy coaching prompt already references the 9-step process:

```typescript
strategy: `Help with strategic planning using the 9-Step Startup Process:
- Which step are they actually on? (Don't let them skip ahead)
- Current challenges and blockers
- What validation is needed before proceeding?
- Resource allocation priorities
- Clear milestones and next actions

Remember: Upstream truth before downstream optimization.`,
```

### Chat Route Context (app/api/fred/chat/route.ts)

The chat request schema already accepts optional context:

```typescript
context: z.object({
  startupName: z.string().optional(),
  stage: z.string().optional(),
  industry: z.string().optional(),
  goals: z.array(z.string()).optional(),
}).optional(),
```

The `industry` field exists in the chat schema but is not collected during onboarding -- it would only be populated if the client explicitly sends it.

### Entity Extraction (lib/fred/actors/validate-input.ts)

The `extractEntities()` function (lines 193-231) currently extracts money, date, and metric entities. It does not extract industry names, team size mentions, or revenue figures from conversational text. This needs to be extended for auto-enrichment.

## What Needs to Be Built

### 1. Extended Onboarding Fields

Add new fields to the onboarding flow:

**New constants (lib/constants.ts):**
```typescript
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
];

export const REVENUE_RANGES = [
  { id: "pre-revenue", label: "Pre-Revenue" },
  { id: "0-10k", label: "$0 - $10K MRR" },
  { id: "10k-50k", label: "$10K - $50K MRR" },
  { id: "50k-100k", label: "$50K - $100K MRR" },
  { id: "100k+", label: "$100K+ MRR" },
];

export const TEAM_SIZES = [
  { id: "solo", label: "Solo Founder" },
  { id: "2-5", label: "2-5 people" },
  { id: "6-15", label: "6-15 people" },
  { id: "16-50", label: "16-50 people" },
  { id: "50+", label: "50+ people" },
];

export const FUNDING_STAGES = [
  { id: "bootstrapped", label: "Bootstrapped" },
  { id: "friends-family", label: "Friends & Family" },
  { id: "pre-seed", label: "Pre-Seed Raised" },
  { id: "seed", label: "Seed Raised" },
  { id: "series-a+", label: "Series A+" },
];
```

**Database migration:** Add columns to `profiles` table:
```sql
ALTER TABLE profiles
  ADD COLUMN industry TEXT,
  ADD COLUMN revenue_range TEXT,
  ADD COLUMN team_size TEXT,
  ADD COLUMN funding_stage TEXT,
  ADD COLUMN company_url TEXT;
```

**Onboarding UI update:** Add a second step to the onboarding flow with the new fields (industry, revenue, team size, funding). Keep the new fields optional to avoid drop-off.

### 2. Auto-Enrichment Extractor (lib/fred/enrichment/extractor.ts)

A module that extracts profile-relevant information from FRED conversation content:

**What it extracts:**
- Industry mentions (match against INDUSTRIES list)
- Revenue/financial figures ("we're doing $30K MRR", "our burn rate is $50K/month")
- Team size mentions ("we just hired our 5th engineer", "our team of 12")
- Funding mentions ("we raised a $500K pre-seed", "bootstrapped so far")
- Product details ("we sell to enterprise", "B2B SaaS platform")
- Goals ("aiming for $1M ARR by Q3", "want to raise Series A")

**How it works:**
1. Runs after each conversation (in the chat route's memory storage step)
2. Analyzes the user's message content
3. Extracts facts using pattern matching + entity recognition
4. Stores extracted facts in semantic memory via `storeFact()`
5. Optionally uses the `fast` AI model for ambiguous extractions

**Integration point:** After `storeEpisode()` in the chat route, call `enrichProfile(userId, message, context)`.

### 3. Profile Snapshot Page (app/dashboard/profile/page.tsx)

A read-only page displaying the founder's current profile, assembled from:

**Data sources:**
- `profiles` table (onboarding data: name, stage, challenge, description, industry, revenue, team_size, funding)
- `fred_semantic_memory` table (enriched facts by category)

**Display sections:**
- **Founder Overview:** Name, role, company name, stage
- **Business Details:** Industry, revenue range, team size, funding stage
- **Key Metrics:** Extracted from semantic memory (metrics category)
- **Goals & Challenges:** From onboarding + semantic memory enrichment
- **Product Details:** Extracted from conversations
- **Team Info:** Extracted from conversations
- **Last Updated:** Timestamp of most recent enrichment

**Actions:**
- Edit profile (link to settings/profile edit page)
- Export as PDF (optional future feature)

### 4. Strategy Reframing Page (app/dashboard/strategy-reframing/page.tsx)

A dedicated UI for the 9-step startup process:

**Layout:**
- Left sidebar: Step navigator showing all 9 steps with status indicators
- Main content: Current step detail with objective, guiding questions, required output
- Bottom: Input area for the founder's responses + FRED coaching

**Step flow:**
1. Determine the founder's current step (from profile data or explicit selection)
2. Display step details from `STARTUP_STEPS` configuration
3. For each step, show: objective, guiding questions, kill signals
4. Founder fills in their responses
5. FRED evaluates responses and determines: validated, needs work, or blocked
6. Gating: Cannot advance until current step is validated
7. Visual progress indicator across all 9 steps

**Data persistence:**
- Store step responses and validation status
- Track which steps are validated
- Allow revisiting completed steps

### 5. Strategy Reframing API

**POST /api/strategy-reframing/evaluate** -- Send step responses to FRED for evaluation
- Body: `{ step: StartupStep, responses: Record<string, string> }`
- Returns: `{ status: StepStatus, feedback: string, canAdvance: boolean, blockers: string[] }`

**GET /api/strategy-reframing/progress** -- Fetch current reframing progress
**POST /api/strategy-reframing/progress** -- Save progress

### 6. Profile Enrichment API

**GET /api/profile/snapshot** -- Assemble full profile from profiles + semantic memory
**POST /api/profile/enrich** -- Manually trigger enrichment from recent conversations

## Integration Points

| Component | Integrates With | How |
|-----------|----------------|-----|
| Onboarding page | profiles table | Stores extended fields |
| Enrichment extractor | chat route (route.ts) | Runs after memory storage |
| Enrichment extractor | fred-memory.ts (semantic) | Stores extracted facts via storeFact() |
| Profile snapshot | profiles table + semantic memory | Reads from both sources |
| Strategy reframing | startup-process.ts | Uses STARTUP_STEPS configuration |
| Strategy reframing | FRED chat API | Sends step responses for evaluation |
| Strategy reframing | COACHING_PROMPTS.strategy | Uses strategy coaching prompt |
| Dashboard nav | constants.ts | Add nav entry for profile + reframing pages |

## Suggested Plan Structure

### Plan 18-01: Enriched Onboarding + Profile Snapshot

**Scope:** Extended onboarding, profile database changes, snapshot page

1. Add new constants (INDUSTRIES, REVENUE_RANGES, TEAM_SIZES, FUNDING_STAGES) to constants.ts
2. Create profiles table migration (add industry, revenue_range, team_size, funding_stage, company_url)
3. Update onboarding page with additional step for new fields
4. Create profile snapshot API (`/api/profile/snapshot`)
5. Create profile snapshot page (`app/dashboard/profile/page.tsx`)
6. Add dashboard navigation entry for profile

### Plan 18-02: Auto-Enrichment + Strategy Reframing UI

**Scope:** Conversation enrichment, strategy reframing page

1. Create enrichment extractor module (`lib/fred/enrichment/extractor.ts`)
2. Integrate enrichment into chat route (after storeEpisode)
3. Create strategy reframing API routes (evaluate, progress)
4. Create strategy reframing page (`app/dashboard/strategy-reframing/page.tsx`)
5. Create step navigator component
6. Create step detail + response form component
7. Wire FRED evaluation for step responses
8. Add dashboard navigation entry for strategy reframing
9. Tests for enrichment extractor and reframing API

## Key Files to Reference

| File | Purpose | Lines of Interest |
|------|---------|-------------------|
| `app/onboarding/page.tsx` | Current onboarding flow | Full file |
| `lib/constants.ts` | FOUNDER_CHALLENGES, STARTUP_STAGES | 98-113 |
| `lib/db/fred-memory.ts` | storeFact(), getAllUserFacts(), getFactsByCategory() | 245-417 |
| `lib/ai/frameworks/startup-process.ts` | 9-step framework with types and step definitions | Full file |
| `lib/fred/strategy/` | Strategy document subsystem (generator, templates, db, types) | Directory |
| `lib/ai/prompts.ts` | COACHING_PROMPTS.strategy | 205-212 |
| `app/api/fred/chat/route.ts` | Chat route where enrichment hooks in | 140-160 (memory storage) |
| `lib/fred/actors/validate-input.ts` | Entity extraction (extend for enrichment) | 193-231 |
| `app/dashboard/page.tsx` | Dashboard layout pattern | Full file |

## Open Questions

1. **Onboarding step count:** Adding 4-5 new fields could make onboarding feel heavy. Should we split into a required first step (name, stage, challenge) and an optional second step (industry, revenue, team, funding)? Recommendation: Yes, keep step 1 as-is and add step 2 as optional "Tell us more" with a skip button.

2. **Auto-enrichment frequency:** Should enrichment run on every message or batch-process after a conversation ends? Recommendation: Run on every user message but with a lightweight check first. If no extractable entities are found, skip the enrichment step entirely.

3. **Strategy reframing persistence:** Should progress be stored in a new table or in semantic memory? Recommendation: New table (`fred_strategy_progress`) with user_id, step, status, responses, feedback, timestamps. Structured data needs structured storage.

4. **Free vs. Pro boundary:** The 9-step reframing UI is Free tier, but full Strategy Documents are Pro. How to differentiate? Recommendation: Reframing is interactive coaching through the 9 steps. Strategy Documents are AI-generated deliverables (PDFs). The reframing page should not generate strategy documents.

## Sources

### Primary (HIGH confidence)
- `app/onboarding/page.tsx` -- current onboarding flow (direct reading)
- `lib/constants.ts` -- onboarding constants (direct reading)
- `lib/db/fred-memory.ts` -- semantic memory CRUD (direct reading)
- `lib/ai/frameworks/startup-process.ts` -- 9-step framework (direct reading)
- `app/api/fred/chat/route.ts` -- chat route with memory storage (direct reading)

### Secondary (MEDIUM confidence)
- `lib/fred/strategy/` -- strategy subsystem (directory listing)
- `.planning/ROADMAP.md` -- phase scope and success criteria

**Research date:** 2026-02-07
**Valid until:** Next onboarding or strategy system refactor
