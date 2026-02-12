# Founder Data Lake -- Data Extraction Specification

**Author:** Schema Architect
**Date:** 2026-02-11
**Status:** DESIGN (not yet implemented)
**Companion doc:** SCHEMA-DESIGN.md

---

## 1. Overview

This document specifies HOW structured data gets extracted from unstructured sources (chat conversations, voice transcripts, documents) and persisted into the `founder_data_points` table.

Three extraction mechanisms operate in concert:

1. **Heuristic Extractor** (existing, enhanced) -- Fast regex/keyword extraction running synchronously after each message. Zero latency cost.
2. **AI Extractor** (new) -- Deep semantic extraction running asynchronously via the `data_extraction_queue`. Uses LLM to understand context and extract nuanced facts.
3. **Direct Input** (existing, enhanced) -- Structured data from forms (onboarding, manual profile edits) written directly to data points.

---

## 2. Field Key Taxonomy

### 2.1 Categories and Their Field Keys

Every data point has a `category` and a `field_key`. This taxonomy defines the universe of what we track.

#### `business_model` -- How the startup makes money

| field_key | Description | Example value |
|---|---|---|
| `business_type` | B2B, B2C, B2B2C, marketplace, etc. | `{ "value": "B2B SaaS" }` |
| `revenue_model` | Subscription, usage-based, transactional, etc. | `{ "value": "subscription", "details": "monthly and annual plans" }` |
| `pricing` | Pricing structure and price points | `{ "value": "$29/mo basic, $99/mo pro", "currency": "USD" }` |
| `unit_economics` | CAC, LTV, margins | `{ "cac": 50, "ltv": 600, "ltv_cac_ratio": 12 }` |
| `value_proposition` | Core value proposition statement | `{ "value": "We help B2B SaaS founders..." }` |
| `one_liner` | One-sentence company description | `{ "value": "Sahara is an AI mentorship platform..." }` |

#### `market` -- Market opportunity and landscape

| field_key | Description | Example value |
|---|---|---|
| `target_market` | Primary target market description | `{ "value": "B2B SaaS founders, pre-seed to Series A" }` |
| `market_size` | TAM/SAM/SOM estimates | `{ "tam": "50B", "sam": "5B", "som": "500M" }` |
| `industry` | Industry vertical | `{ "value": "AI/ML" }` |
| `geographic_focus` | Geographic market focus | `{ "value": "US, initially Bay Area" }` |
| `market_trends` | Key market trends/tailwinds | `{ "trends": ["AI adoption", "remote work"] }` |
| `why_now` | Why is now the right time | `{ "value": "AI costs dropped 90% in 2 years" }` |

#### `financials` -- Revenue, burn, runway

| field_key | Description | Example value |
|---|---|---|
| `monthly_revenue` | Current MRR | `{ "value": 50000, "unit": "USD", "period": "monthly" }` |
| `annual_revenue` | Current ARR | `{ "value": 600000, "unit": "USD", "period": "annual" }` |
| `revenue_range` | Revenue bracket | `{ "value": "$10k-50k" }` |
| `burn_rate` | Monthly burn rate | `{ "value": 30000, "unit": "USD", "period": "monthly" }` |
| `runway_months` | Months of runway remaining | `{ "value": 18, "unit": "months" }` |
| `runway_detail` | Structured runway (time/money/energy) | `{ "time": "18 months", "money": "$500k", "energy": "high" }` |
| `funding_raised` | Total funding raised to date | `{ "value": 500000, "unit": "USD" }` |
| `revenue_growth` | Growth rate | `{ "value": 15, "unit": "percent", "period": "mom" }` |
| `gross_margin` | Gross margin percentage | `{ "value": 80, "unit": "percent" }` |

#### `team` -- Team composition and capabilities

| field_key | Description | Example value |
|---|---|---|
| `team_size` | Number of team members | `{ "value": 5 }` |
| `founder_count` | Number of co-founders | `{ "value": 2 }` |
| `stage` | Company stage | `{ "value": "seed" }` |
| `founder_background` | Founder experience/credentials | `{ "value": "Ex-Google eng, 10 years in ML" }` |
| `key_hires_needed` | Critical roles to fill | `{ "roles": ["CTO", "Head of Sales"] }` |
| `technical_capability` | Technical team strength | `{ "value": "strong", "details": "3 senior engineers" }` |
| `founder_edge` | Unfair advantage / unique insight | `{ "value": "Built similar system at Google" }` |

#### `product` -- Product status and details

| field_key | Description | Example value |
|---|---|---|
| `product_status` | Current product stage | `{ "value": "mvp" }` |
| `product_description` | What the product does | `{ "value": "AI-powered pitch deck analyzer" }` |
| `tech_stack` | Technology stack | `{ "value": "Next.js, Supabase, OpenAI" }` |
| `key_features` | Core features | `{ "features": ["auto-scoring", "slide analysis", "competitor benchmarks"] }` |
| `product_differentiator` | What makes it different | `{ "value": "Only tool that scores from VC perspective" }` |
| `simplest_solution` | Simplest viable solution (9-Step) | `{ "value": "Landing page + manual outreach" }` |

#### `customers` -- Customer base and traction

| field_key | Description | Example value |
|---|---|---|
| `customer_count` | Number of customers/users | `{ "value": 150, "type": "paying" }` |
| `economic_buyer` | Who makes the purchase decision | `{ "value": "VP of Engineering" }` |
| `user_if_different` | End user if different from buyer | `{ "value": "Individual developers" }` |
| `icp` | Ideal customer profile | `{ "value": "Series A SaaS companies, 50-200 employees" }` |
| `retention_rate` | Customer retention | `{ "value": 85, "unit": "percent", "period": "monthly" }` |
| `churn_rate` | Customer churn | `{ "value": 5, "unit": "percent", "period": "monthly" }` |
| `nps` | Net Promoter Score | `{ "value": 45 }` |
| `customer_feedback` | Key customer feedback themes | `{ "themes": ["easy to use", "need more integrations"] }` |
| `dau` | Daily active users | `{ "value": 500 }` |
| `mau` | Monthly active users | `{ "value": 3000 }` |

#### `competition` -- Competitive landscape

| field_key | Description | Example value |
|---|---|---|
| `competitors` | Known competitors | `{ "direct": ["Competitor A", "Competitor B"], "indirect": ["Big Corp"] }` |
| `competitive_advantage` | Key differentiators vs competition | `{ "value": "10x faster analysis, VC-specific scoring" }` |
| `market_position` | Where they sit in the market | `{ "value": "niche player in AI-for-VC space" }` |
| `vs_alternatives` | How customers solve this today | `{ "value": "Manual review by associates, 2-3 days per deck" }` |

#### `fundraising` -- Fundraising status and plans

| field_key | Description | Example value |
|---|---|---|
| `funding_stage` | Current/target funding stage | `{ "value": "raising seed" }` |
| `funding_history` | Past funding rounds | `{ "value": "pre-seed $250k from angels" }` |
| `target_raise` | Target raise amount | `{ "value": 2000000, "unit": "USD" }` |
| `valuation` | Current/target valuation | `{ "value": 10000000, "unit": "USD", "type": "pre-money" }` |
| `investor_conversations` | Active investor pipeline | `{ "active": 5, "term_sheets": 0 }` |
| `use_of_funds` | How they plan to use raised capital | `{ "allocation": {"engineering": 40, "sales": 30, "marketing": 20, "ops": 10} }` |

#### `gtm` -- Go-to-market strategy

| field_key | Description | Example value |
|---|---|---|
| `gtm_channel` | Primary GTM channel | `{ "value": "content marketing + PLG" }` |
| `gtm_approach` | Overall GTM strategy | `{ "value": "bottom-up PLG with sales-assist for enterprise" }` |
| `distribution_advantage` | Distribution moat | `{ "value": "partnerships with 3 accelerators" }` |
| `cac` | Customer acquisition cost | `{ "value": 50, "unit": "USD" }` |
| `sales_cycle` | Average sales cycle length | `{ "value": 30, "unit": "days" }` |
| `conversion_rate` | Key conversion metric | `{ "value": 3.5, "unit": "percent", "funnel_stage": "trial_to_paid" }` |

#### `legal_regulatory` -- Legal and compliance

| field_key | Description | Example value |
|---|---|---|
| `incorporation` | Legal structure | `{ "value": "Delaware C-Corp" }` |
| `ip_status` | Intellectual property | `{ "patents": 0, "trademarks": 1 }` |
| `regulatory_concerns` | Regulatory requirements | `{ "value": "HIPAA compliance required" }` |
| `cap_table_status` | Cap table cleanliness | `{ "value": "clean", "investors": 3 }` |

#### `milestones` -- Goals and progress

| field_key | Description | Example value |
|---|---|---|
| `ninety_day_goal` | Primary 90-day goal | `{ "value": "10 paying customers" }` |
| `primary_constraint` | Biggest blocker right now | `{ "value": "demand" }` |
| `recent_milestone` | Last significant milestone | `{ "value": "launched MVP", "date": "2026-01" }` |
| `next_milestone` | Next target milestone | `{ "value": "first 100 users", "target_date": "2026-04" }` |
| `weekly_priorities` | Current weekly focus areas | `{ "priorities": ["ship feature X", "close 3 sales calls"] }` |

#### `challenges` -- Current pain points

| field_key | Description | Example value |
|---|---|---|
| `primary_challenge` | Biggest current challenge | `{ "value": "finding product-market fit" }` |
| `technical_challenges` | Technical blockers | `{ "challenges": ["scaling to 10k concurrent users"] }` |
| `hiring_challenges` | Hiring difficulties | `{ "value": "can't find senior backend engineer" }` |
| `market_challenges` | Market-related challenges | `{ "value": "long enterprise sales cycles" }` |

#### `metrics` -- Key business metrics

| field_key | Description | Example value |
|---|---|---|
| `mrr` | Monthly Recurring Revenue | `{ "value": 50000, "unit": "USD" }` |
| `arr` | Annual Recurring Revenue | `{ "value": 600000, "unit": "USD" }` |
| `gmv` | Gross Merchandise Value | `{ "value": 1000000, "unit": "USD", "period": "monthly" }` |
| `ltv` | Customer Lifetime Value | `{ "value": 2400, "unit": "USD" }` |
| `cac` | Customer Acquisition Cost | `{ "value": 200, "unit": "USD" }` |
| `burn_rate` | Monthly burn | `{ "value": 30000, "unit": "USD" }` |
| `custom_metric` | Any user-defined metric | `{ "name": "API calls/day", "value": 50000 }` |

---

## 3. AI Extraction Prompt Design

### 3.1 Chat Message Extraction Prompt

Used by the extraction worker to process chat conversation segments.

```
SYSTEM:
You are a structured data extraction engine for a startup mentorship platform.
Your job is to extract CONCRETE FACTS about a founder's business from their
conversation messages. Only extract facts that are explicitly stated or strongly
implied. Do NOT infer or guess.

Rules:
1. Only extract facts the founder explicitly stated or strongly implied
2. Assign confidence 0.9-1.0 for explicit statements ("our MRR is $50k")
3. Assign confidence 0.6-0.8 for implied facts ("we're doing well, almost at $50k")
4. Assign confidence 0.4-0.5 for weak signals ("revenue is growing")
5. Do NOT extract information the AI assistant said -- only extract USER messages
6. If the user corrects a previous statement, extract the CORRECTED value
7. Use the exact field_key names from the taxonomy below
8. Values must be structured JSON, not plain strings

Category and field_key taxonomy:
[INSERT FULL TAXONOMY FROM SECTION 2 HERE]

USER:
Extract structured business facts from these conversation messages.
Return a JSON array of extracted data points.

Messages:
---
[USER MESSAGES FROM THE CONVERSATION]
---

Respond with ONLY valid JSON in this format:
{
  "extractions": [
    {
      "category": "financials",
      "field_key": "monthly_revenue",
      "field_value": { "value": 50000, "unit": "USD", "period": "monthly" },
      "confidence": 0.95,
      "evidence": "User said: 'we just hit $50k MRR last month'"
    }
  ]
}

If no concrete facts can be extracted, return: { "extractions": [] }
```

### 3.2 Voice Transcript Extraction Prompt

Similar to chat but adapted for voice conversation patterns (more informal, more interruptions, less precise language).

```
SYSTEM:
You are extracting structured business data from a voice call transcript
between a startup mentor (Fred) and a founder. Voice transcripts may have:
- Filler words and informal language
- Interruptions and incomplete sentences
- Numbers that may be approximate ("about fifty K" = ~$50,000)
- Context that spans multiple turns

Apply the same extraction rules as chat, but:
- Be more generous with confidence for voice (0.5 for approximate numbers)
- Clean up informal number references (fifty K -> 50000)
- Look for information revealed in response to direct questions
- The mentor's questions provide context for what the founder's answers mean

[SAME TAXONOMY AND FORMAT AS CHAT]
```

### 3.3 Document Extraction Prompt

For uploaded documents (pitch decks, financial models, etc.).

```
SYSTEM:
You are extracting structured business data from a founder's uploaded document.
This document may be a pitch deck, financial model, strategy document, or
business plan. Extract EVERY concrete fact with high confidence.

Document-specific rules:
- Numbers in documents are typically more precise than chat -- assign 0.9+ confidence
- Extract data from tables, charts (described in text), and bullet points
- For pitch decks: extract from each slide's content
- Ignore boilerplate and template text

[SAME TAXONOMY AND FORMAT AS CHAT]
```

---

## 4. Confidence Scoring Approach

### 4.1 Confidence Levels

| Level | Range | Description | Examples |
|---|---|---|---|
| **Definitive** | 0.95-1.0 | Explicit, unambiguous statement | "Our MRR is $50,000" |
| **Strong** | 0.80-0.94 | Clear statement with minor ambiguity | "We're at about $50k MRR" |
| **Moderate** | 0.60-0.79 | Implied or contextual | "Revenue is growing, close to $50k" |
| **Weak** | 0.40-0.59 | Vague or uncertain | "We're doing decent revenue" |
| **Speculative** | 0.20-0.39 | Inference from indirect signals | "We have 5 enterprise clients" -> ~$50k MRR (speculative) |

### 4.2 Confidence Modifiers

| Modifier | Effect | Rationale |
|---|---|---|
| Source is `onboarding` or `manual` | +0.1 | User intentionally provided this data |
| Source is `chat` with direct statement | Base | Standard extraction |
| Source is `voice` | -0.05 | Transcription errors possible |
| Source is `document` | +0.05 | Documents are typically reviewed/polished |
| Source is `inferred` by AI | -0.15 | No explicit statement |
| User confirms a value | Set to 1.0 | User-confirmed is ground truth |
| Value contradicts previous value | Max 0.85 | Needs confirmation |

### 4.3 Confidence Decay

Over time, confidence in data points should decay for time-sensitive fields:

| Category | Decay Rate | Rationale |
|---|---|---|
| `financials.*` | -0.05/month | Revenue changes monthly |
| `customers.*` | -0.03/month | Customer counts change |
| `team.team_size` | -0.02/month | Team changes are slower |
| `market.*` | -0.01/month | Market insights are more durable |
| `business_model.*` | -0.01/month | Business model changes rarely |
| `milestones.*` | -0.10/month | Goals become stale quickly |
| `challenges.*` | -0.05/month | Challenges evolve |

**Implementation:** A scheduled job runs weekly, reducing confidence on data points based on their category's decay rate and the time since `extracted_at`. This helps surface "you mentioned your MRR was $50k 3 months ago -- is it still accurate?"

---

## 5. Deduplication and Conflict Resolution

### 5.1 Same Field, Same Value

When extraction produces a fact that matches the current value for the same `(user_id, category, field_key)`:

- **Action:** Skip insertion. Optionally update `confidence` if the new extraction has higher confidence.
- **Rationale:** No version bump needed for redundant data.

### 5.2 Same Field, Different Value

When extraction produces a fact that differs from the current value:

- **Action:**
  1. Mark old data point as `is_current = false`, set `superseded_at = now()`
  2. Insert new data point with `version = old_version + 1`, `is_current = true`
  3. Log change to `founder_data_history`
  4. Trigger staleness update on affected documents
- **Rationale:** The new value is presumed correct; history preserves the old value.

### 5.3 Same Field, Conflicting Sources (Chat vs. Intake)

When chat says revenue is $10k but an intake form says $15k:

**Resolution strategy: Most Recent + Highest Confidence Wins**

1. Compare timestamps: more recent data is preferred
2. If timestamps are within 24 hours: higher confidence wins
3. If confidence is equal: source priority order:
   - `manual` (user explicitly set this) > `onboarding` > `document` > `chat` > `voice` > `system` > `inferred`
4. The losing value is preserved in history with a `change_context` noting the conflict

### 5.4 Same Field, Multiple Values in One Conversation

If a founder says "our revenue is $10k... actually wait, it's $15k" in the same conversation:

- The AI extractor is instructed to extract the CORRECTED value only
- The heuristic extractor may capture both; the later extraction (higher position in message list) takes precedence

### 5.5 Value Normalization

Before comparison, values are normalized:

| Type | Normalization |
|---|---|
| Currency | Convert to cents (integer). "$50k" = 5000000. "$50K MRR" -> `{ value: 5000000, unit: "cents", period: "monthly" }` |
| Percentages | Store as float 0-100. "5%" = 5.0 |
| Counts | Store as integer. "about 150 customers" = 150 |
| Text | Trim, lowercase for comparison. Keep original case in storage. |
| Dates | ISO 8601 format |

---

## 6. Extraction Pipeline Architecture

### 6.1 Synchronous Path (Heuristic -- via XState Execute Actor)

The heuristic extraction runs synchronously within the execute actor, after the decision is made. This is the same timing as the existing `logDecisionToMemory()` and `updateConversationState()` calls.

```
XState pipeline reaches "execute" state
       |
       v
  execute actor fires
       |
       ├─ logDecisionToMemory()          [existing]
       ├─ updateConversationState()       [existing]
       │
       ├─ extractAndPersistDataPoints()   [NEW]
       │       |
       │       ├─ Enrichment extractor runs
       │       │  (lib/fred/enrichment/extractor.ts -- ENHANCED)
       │       │
       │       ├─ ValidatedInput entity extraction
       │       │  (reuse already-parsed entities from validate-input actor)
       │       │
       │       └─ For each detected field:
       │           - Map to (category, field_key) from taxonomy
       │           - Check if current data point exists
       │           - If new or different: write to founder_data_points
       │           - Log to founder_data_history if changed
       │
       └─ return response (no delay -- extraction is fire-and-forget)
```

**Enhancement to existing extractor:** The current `extractProfileEnrichment()` function returns a flat `ProfileEnrichment` object. Enhance it to ALSO return an array of `{ category, field_key, field_value, confidence }` objects matching the taxonomy. The existing flat format is preserved for backward compatibility (writing to `profiles.enrichment_data`), while the new array format drives the data lake writes.

**Leveraging ValidatedInput:** The validate-input actor (`lib/fred/actors/validate-input.ts`) already extracts entities (money amounts, dates, metric values), topics (fundraising, strategy, etc.), and intent. These parsed structures are available in the execute actor via `validatedInput.entities` and `validatedInput.topics`. Rather than re-parsing the message, the data lake extractor should map these already-parsed entities to data points.

### 6.2 Asynchronous Path (AI -- Background Processing)

The AI extraction is enqueued from the execute actor as a fire-and-forget operation. The extraction worker runs separately (cron job, Supabase Edge Function, or queue consumer).

```
Execute actor (in XState pipeline)
       |
       v
  Enqueue to data_extraction_queue (fire-and-forget)
  { user_id, source_type='chat', source_id=sessionId,
    raw_content=<last N user messages> }
       |
       v
  [Time passes -- worker picks up job asynchronously]
       |
       v
  Extraction Worker (cron or queue consumer)
  Picks up pending items, processes with AI:
       |
       v
  1. Call AI extraction prompt with raw_content
  2. Parse JSON response
  3. For each extraction:
     a. Validate category + field_key against taxonomy
     b. Normalize value
     c. Check deduplication rules (compare with existing current data points)
     d. Write to founder_data_points (versioned)
     e. Log to founder_data_history
     f. Sync to fred_semantic_memory (UPSERT for FRED's working memory)
  4. Update extraction_status = 'completed'
  5. Update profiles.data_completeness_score
```

### 6.3 When to Enqueue Extraction

| Trigger | What gets enqueued | Debounce |
|---|---|---|
| Chat session: every 5 user messages | Last 5 user messages | 60 seconds |
| Chat session: on explicit topic change | Last 3 messages before + after topic change | None |
| Voice call: on call end | Full transcript | None |
| Document upload: on processing complete | Full document text (chunked) | None |

### 6.4 Extraction Worker Design

```typescript
// Pseudocode for the extraction worker

async function processExtractionQueue() {
  const pending = await getPendingExtractions(limit: 10);

  for (const item of pending) {
    try {
      await markAsProcessing(item.id);

      // Call AI for extraction
      const extractions = await aiExtract(item.source_type, item.raw_content);

      let pointsCreated = 0;

      for (const ext of extractions) {
        // Validate against taxonomy
        if (!isValidFieldKey(ext.category, ext.field_key)) continue;

        // Check existing current value
        const existing = await getCurrentDataPoint(
          item.user_id, ext.category, ext.field_key
        );

        if (existing && valuesMatch(existing.field_value, ext.field_value)) {
          // Same value: optionally update confidence
          if (ext.confidence > existing.confidence) {
            await updateConfidence(existing.id, ext.confidence);
          }
          continue;
        }

        // Different or new: version and persist
        if (existing) {
          await supersede(existing.id);
        }

        const newPoint = await insertDataPoint({
          user_id: item.user_id,
          category: ext.category,
          field_key: ext.field_key,
          field_value: ext.field_value,
          confidence: ext.confidence,
          source: item.source_type,
          source_reference_id: item.source_id,
          version: existing ? existing.version + 1 : 1,
          is_current: true,
        });

        // Log history
        await insertHistory({
          user_id: item.user_id,
          category: ext.category,
          field_key: ext.field_key,
          old_value: existing?.field_value ?? null,
          new_value: ext.field_value,
          change_source: item.source_type,
          change_context: ext.evidence,
          old_data_point_id: existing?.id,
          new_data_point_id: newPoint.id,
        });

        // Sync to semantic memory (for FRED's working context)
        await syncToSemanticMemory(item.user_id, ext, newPoint.id);

        pointsCreated++;
      }

      await markAsCompleted(item.id, pointsCreated);

    } catch (error) {
      await markAsFailed(item.id, error.message);
    }
  }
}
```

---

## 7. Integration Points (XState Architecture)

### 7.0 Architecture Context: FRED's XState Pipeline

FRED's cognitive engine uses XState v5 (`lib/fred/machine.ts`) with this state flow:

```
idle → loading_memory → intake → validation → mental_models → synthesis → decide → execute → complete
```

Each state invokes an actor (async function) defined in `lib/fred/actors/`:
- `load-memory.ts` -- loads episodic/semantic/procedural memory (tier-gated)
- `validate-input.ts` -- parses intent, entities, sentiment, urgency, topics
- `mental-models.ts` -- applies analysis frameworks
- `synthesize.ts` -- synthesizes recommendation
- `decide.ts` -- determines action type
- **`execute.ts`** -- executes the decision, stores memory, fires side effects

**The execute actor is the canonical integration point for data lake extraction.** It runs AFTER the decision is made and the response is prepared. It already performs fire-and-forget side effects:

1. `logDecisionToMemory()` -- stores episodic + decision log entries
2. `updateConversationState()` -- updates 9-Step progress (Phase 36)
3. **`extractAndPersistDataPoints()`** -- NEW: data lake extraction (this spec)

### 7.1 Execute Actor Integration (`lib/fred/actors/execute.ts`)

The execute actor is the primary write path into the data lake for chat conversations.

**Current signature:**
```typescript
export async function executeActor(
  decision: DecisionResult,
  validatedInput: ValidatedInput,
  userId: string,
  sessionId: string,
  conversationState?: ConversationStateContext | null
): Promise<FredResponse>
```

**Data available at this point for extraction:**
- `decision.content` -- the AI response text
- `validatedInput.originalMessage` -- the user's raw message
- `validatedInput.entities` -- already-parsed entities (money, dates, metrics)
- `validatedInput.intent` -- classified intent (question, information, decision_request, etc.)
- `validatedInput.topics` -- detected topics (fundraising, pitchReview, strategy, etc.)
- `validatedInput.sentiment` -- positive/negative/neutral
- `validatedInput.urgency` -- low/medium/high
- `userId`, `sessionId` -- for scoping and reference

**Target implementation:**
```typescript
export async function executeActor(
  decision: DecisionResult,
  validatedInput: ValidatedInput,
  userId: string,
  sessionId: string,
  conversationState?: ConversationStateContext | null
): Promise<FredResponse> {
  // 1. Log decision to memory [EXISTING]
  await logDecisionToMemory(decision, validatedInput, userId, sessionId);

  // 2. Build the response [EXISTING]
  const response = buildResponse(decision, validatedInput);

  // 3. Update conversation state [EXISTING, Phase 36]
  updateConversationState(userId, validatedInput, decision, conversationState || null)
    .catch((err) => console.warn("[FRED Execute] State update failed:", err));

  // 4. Data lake extraction [NEW -- fire-and-forget]
  extractAndPersistDataPoints(userId, sessionId, validatedInput, decision)
    .catch((err) => console.warn("[FRED Execute] Data lake extraction failed:", err));

  return response;
}
```

**The new `extractAndPersistDataPoints` function:**

Per architect recommendation: extraction logic is kept SEPARATE from persistence logic. The existing `enrichment/extractor.ts` continues to extract (and doesn't know about the data lake schema). A new `data-lake-writer.ts` module handles mapping extracted data to the taxonomy and persisting to `founder_data_points`.

**File structure:**
```
lib/fred/enrichment/extractor.ts      -- EXISTING: heuristic extraction (unchanged)
lib/fred/data-lake/writer.ts          -- NEW: maps extractions to taxonomy, persists to data lake
lib/fred/data-lake/taxonomy.ts        -- NEW: field_key validation, category constants
lib/fred/data-lake/types.ts           -- NEW: DataPointInput, DataLakeSnapshot types
```

```typescript
// lib/fred/data-lake/writer.ts
import type { ProfileEnrichment } from '../enrichment/extractor';
import type { ValidatedInput, DecisionResult } from '../types';

interface DataPointInput {
  category: string;
  fieldKey: string;
  fieldValue: Record<string, unknown>;
  confidence: number;
}

/**
 * Map enrichment extractor output + validated input to data lake taxonomy.
 * This function is pure mapping -- no DB calls.
 */
export function mapToDataPoints(
  enrichment: ProfileEnrichment | null,
  validatedInput: ValidatedInput,
): DataPointInput[] { /* ... */ }

/**
 * Persist data points to founder_data_points with versioning.
 * Handles dedup, version increment, history logging, semantic memory sync.
 */
export async function persistDataPoints(
  userId: string,
  dataPoints: DataPointInput[],
  source: string,
  sourceReferenceId: string,
): Promise<{ created: number; updated: number; skipped: number }> { /* ... */ }
```

```typescript
// In lib/fred/actors/execute.ts
async function extractAndPersistDataPoints(
  userId: string,
  sessionId: string,
  validatedInput: ValidatedInput,
  decision: DecisionResult
): Promise<void> {
  const tier = await getUserTier(userId);

  // STEP 1: Extract (extraction logic -- doesn't know about data lake)
  const enrichment = extractProfileEnrichment([
    { role: "user", content: validatedInput.originalMessage },
    { role: "assistant", content: decision.content },
  ]);

  // STEP 2: Map + Persist (persistence logic -- knows the taxonomy)
  const { mapToDataPoints, persistDataPoints } = await import('@/lib/fred/data-lake/writer');
  const dataPoints = mapToDataPoints(enrichment, validatedInput);

  if (dataPoints.length > 0) {
    await persistDataPoints(userId, dataPoints, 'chat', sessionId);
  }

  // STEP 3: Enqueue AI extraction (Pro+ only)
  if (tier !== 'free') {
    await enqueueExtraction({
      userId,
      sourceType: 'chat',
      sourceId: sessionId,
      rawContent: validatedInput.originalMessage,
      priority: tier === 'studio' ? 'high' : 'normal',
    });
  }

  // STEP 4: Backward compat -- also write to profiles.enrichment_data
  // (can be removed once all consumers read from data lake)
  if (enrichment) {
    await updateProfileEnrichment(userId, enrichment);
  }
}
```

**Key design principle:** The enrichment extractor (`extractor.ts`) remains a pure extraction function -- it doesn't know about `founder_data_points`, the taxonomy, or versioning. The data-lake writer (`writer.ts`) handles the mapping and persistence. This separation means:
- The extractor can be unit-tested with just message input/output
- The writer can be unit-tested with just data point input/DB assertions
- Either can be swapped independently (e.g., replace heuristic extractor with AI, or change persistence backend)

**Refactoring note:** The `fireEnrichment()` function currently in `app/api/fred/chat/route.ts` (lines ~99-175, called at line ~332 and ~543) should be REMOVED from the chat route and consolidated into the execute actor. This eliminates duplicate extraction and centralizes all post-response side effects.

### 7.2 Chat Route Refactoring (`app/api/fred/chat/route.ts`)

After the execute actor takes over data extraction, the chat route's `fireEnrichment()` call becomes redundant. The refactoring is:

```diff
- // Phase 18-02: Fire-and-forget enrichment extraction
- fireEnrichment(userId, [
-   { role: "user", content: message },
-   { role: "assistant", content: result.response.content },
- ]);
+ // Data extraction now handled by execute actor within FredService
+ // (see lib/fred/actors/execute.ts → extractAndPersistDataPoints)
```

The entire `fireEnrichment()` helper function (lines ~99-175) can be removed from the chat route.

### 7.3 Voice Agent (`workers/voice-agent/agent.ts`)

The voice agent currently has ZERO data persistence. Integration requires:

```typescript
// On session close:
session.on('close', async (ev) => {
  // 1. Save transcript to voice_calls table [EXISTING -- needs user_id]
  await saveTranscript(callId, userId, fullTranscript);

  // 2. Enqueue for AI extraction [NEW]
  await enqueueExtraction({
    userId: participantUserId, // Resolve LiveKit participant → auth.users.id
    sourceType: 'voice',
    sourceId: callId,
    rawContent: fullTranscript,
  });
});
```

**User ID resolution:** The voice agent must map a LiveKit participant to an `auth.users` UUID. Recommended approach: include `user_id` in the LiveKit room join token metadata, passed from the frontend when the user initiates a voice call.

### 7.4 Context Builder Integration (`lib/fred/context-builder.ts`)

The context builder is the READ path -- it reads from the data lake to build FRED's system prompt. This is the complement to the execute actor (which writes).

**Current `buildFounderContext()` reads from:**
- `profiles` table (name, stage, industry, etc.)
- `fred_semantic_memory` (category/key/value)

**Target reads from (with explicit precedence rules):**

Per architect recommendation: the context builder needs clear precedence rules to avoid duplicate or conflicting data in the FRED prompt. The three sources are merged with this priority order:

| Priority | Source | What it provides | When to use |
|----------|--------|-----------------|-------------|
| 1 (highest) | `founder_data_points` | Versioned, structured business facts | PRIMARY source for any field in the data lake taxonomy |
| 2 (fallback) | `profiles` table | name, email, tier, stage, onboarding status | Fields NOT yet in the data lake, or non-business fields |
| 3 (supplementary) | `fred_semantic_memory` | User preferences, conversational context, procedural facts | Facts that DON'T map to the data lake taxonomy (e.g., "user prefers bullet points", "user gets frustrated by jargon") |

**Merge rules:**
- For fields that exist in BOTH `founder_data_points` and `profiles`: use the data lake value (higher confidence, versioned)
- For fields that exist in BOTH `founder_data_points` and `fred_semantic_memory`: use the data lake value (since the data lake writes TO semantic memory, they should match -- but if they diverge, data lake wins)
- `fred_semantic_memory` facts whose `category` + `key` map to a data lake category should be SKIPPED if the data lake has a current value (avoids duplication)
- `fred_semantic_memory` facts whose `category` + `key` do NOT map to any data lake category are included (e.g., `user_preferences.*`, `decisions.*`)

```typescript
export async function buildFounderContext(
  userId: string,
  hasPersistentMemory: boolean
): Promise<string> {
  const [profile, dataLakeSnapshot, facts, isFirstConversation, progressContext] = await Promise.all([
    loadFounderProfile(userId),           // existing
    loadDataLakeSnapshot(userId),         // NEW -- reads founder_data_points
    loadSemanticFacts(userId, hasPersistentMemory),  // existing
    checkIsFirstConversation(userId),     // existing
    loadProgressContext(userId),           // existing
  ]);

  // Data lake snapshot takes PRIORITY over profile fields
  // Profile fields used as fallback for data not yet in the lake
  let context = buildContextBlock({
    profile,
    dataLake: dataLakeSnapshot,  // NEW
    facts,
    isFirstConversation,
  });

  if (progressContext) {
    context += "\n\n" + progressContext;
  }

  return context;
}
```

**Tier gating on the read path:**
```typescript
async function loadDataLakeSnapshot(userId: string): Promise<DataLakeSnapshot> {
  const tier = await getUserTier(userId);
  const supabase = createServiceClient();

  let query = supabase
    .from('founder_data_points')
    .select('category, field_key, field_value, confidence, source, extracted_at')
    .eq('user_id', userId)
    .eq('is_current', true)
    .order('confidence', { ascending: false });

  // Free tier: limit to most recent 30 data points
  if (tier === 'free') {
    query = query.limit(30);
  }

  const { data } = await query;
  return groupByCategory(data ?? []);
}
```

### 7.5 Document Generation Routes

When generating any document, READ from founder_data_points:

```typescript
// Load all current data points for the user
const dataPoints = await getCurrentDataPoints(userId);

// Group by category
const founderData = groupByCategory(dataPoints);

// Build structured context for AI prompt
const context = buildDocumentContext(founderData);

// Generate document
const doc = await generateDocument(type, context);

// Save as living document with data dependencies
const livingDoc = await saveLivingDocument(userId, type, doc);
await recordDataDependencies(livingDoc.id, getDocumentDependencies(type));
```

### 7.6 Loading Memory Actor (`lib/fred/actors/load-memory.ts`)

The loading_memory state runs BEFORE intake/validation. It currently loads episodic, semantic, and procedural memory (tier-gated). With the data lake:

- **No change needed for the initial implementation.** The context-builder already runs before the XState machine is created (it's injected via `FredServiceOptions.founderContext`). Data lake reading happens there, not in the load-memory actor.
- **Future enhancement:** The load-memory actor could load data lake snapshot INTO the machine context so that downstream actors (mental models, synthesis) have direct access to structured founder data. This would enable richer analysis without re-querying.

---

## 8. Testing Strategy

### 8.1 Extraction Accuracy Tests

For each category, maintain a test corpus of real conversation snippets with expected extractions:

```typescript
// Example test case
{
  input: "We just hit $50k MRR last month. Team is 5 people now.",
  expected: [
    { category: "financials", field_key: "monthly_revenue", confidence: ">=0.9" },
    { category: "team", field_key: "team_size", confidence: ">=0.9" },
  ]
}
```

### 8.2 Versioning Tests

- Insert value A, then insert different value B for same field -> verify version increments
- Insert value A, then insert same value A again -> verify no version bump
- Insert value A (confidence 0.7), then same value A (confidence 0.9) -> verify confidence updated

### 8.3 Conflict Resolution Tests

- Chat says $10k, then onboarding says $15k within 1 hour -> verify highest confidence wins
- Chat says $10k at 9am, then chat says $15k at 5pm -> verify latest wins
- Voice says "about fifty thousand" -> verify normalized to 50000

### 8.4 Staleness Tests

- Generate document, then change a dependent field -> verify staleness_score > 0
- Generate document, change a non-dependent field -> verify staleness_score = 0
- Verify auto_refresh triggers regeneration when threshold exceeded

---

## 9. Observability

### 9.1 Metrics to Track

| Metric | Description |
|---|---|
| `extraction_queue_depth` | Number of pending items in data_extraction_queue |
| `extraction_latency_p50` | Median time from enqueue to completed |
| `extraction_latency_p95` | 95th percentile extraction latency |
| `extractions_per_conversation` | Average data points extracted per chat session |
| `extractions_per_voice_call` | Average data points extracted per voice call |
| `data_points_per_user` | Average current data points per user |
| `categories_populated_per_user` | Average distinct categories with data |
| `staleness_scores_histogram` | Distribution of document staleness scores |
| `auto_refresh_triggers` | Count of auto-refresh regenerations |
| `conflict_resolutions` | Count of deduplication conflicts resolved |
| `confidence_distribution` | Histogram of confidence scores across all data points |

### 9.2 Alerts

| Alert | Condition | Severity |
|---|---|---|
| Extraction queue backing up | pending items > 100 for > 5 minutes | Warning |
| Extraction failures | failed items > 10% of processed in last hour | Error |
| AI extraction cost spike | Extraction API cost > $X in last hour | Warning |

---

## 10. Privacy and Data Retention

1. **All founder data points are scoped to `user_id`** -- RLS enforced at database level.

2. **History is retained indefinitely** for audit purposes. A future data retention policy may archive history older than 2 years.

3. **Extraction queue raw_content is purged** after 30 days (only the structured extractions persist in `founder_data_points`).

4. **User data deletion (GDPR):** Deleting a user via `auth.users` ON DELETE CASCADE propagates to all data lake tables through the foreign key chain.

5. **No PII in field_keys** -- The taxonomy uses generic keys. Personal information (names, emails, phone numbers) is stored in `profiles`, not in the data lake. The data lake stores BUSINESS facts only.
